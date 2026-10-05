package expo.modules.videocomposer

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.audio.DefaultGainProvider
import androidx.media3.common.audio.GainProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import kotlin.math.ceil
import kotlin.math.min

class ComposeOptions : Record {
  /** Seamlessly looping background clip (file://). */
  @Field val backgroundUri: String = ""
  /** Full-frame 1080x1920 PNG of the card with a transparent background (file://). */
  @Field val overlayUri: String = ""
  /** Ambient sound (file://), or null for a silent story. */
  @Field val soundUri: String? = null
  /** Length of the story. */
  @Field val durationMs: Double = 15_000.0
  /** Length of one loop of the background clip. */
  @Field val clipDurationMs: Double = 8_000.0
}

/**
 * Renders a video story on the device with Media3 Transformer: the background
 * clip repeated to the story's length, the card drawn over every frame, and an
 * ambient sound looped underneath with a fade in and out. Nothing is uploaded;
 * the MP4 is written to the app's cache and shared from there.
 */
@OptIn(markerClass = [UnstableApi::class])
class VideoComposerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val main = Handler(Looper.getMainLooper())
  private var active: Transformer? = null

  override fun definition() = ModuleDefinition {
    Name("VideoComposer")
    Events("onProgress")

    // Transformer must be driven from a thread with a Looper; the main queue has one.
    AsyncFunction("compose") { options: ComposeOptions, promise: Promise ->
      if (active != null) {
        promise.reject("ERR_BUSY", "A video is already being rendered", null)
        return@AsyncFunction
      }
      try {
        start(options, promise)
      } catch (e: Exception) {
        active = null
        promise.reject("ERR_COMPOSE", e.message ?: "Could not start the video", e)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("cancel") {
      active?.cancel()
      active = null
    }.runOnQueue(Queues.MAIN)
  }

  private fun start(options: ComposeOptions, promise: Promise) {
    val durationUs = (options.durationMs * 1000).toLong()
    val clipUs = (options.clipDurationMs * 1000).toLong()
    require(durationUs > 0 && clipUs > 0) { "Invalid durations" }

    val overlay = loadOverlay(options.overlayUri)
    val videoEffects = Effects(
      emptyList(),
      listOf(
        Presentation.createForWidthAndHeight(WIDTH, HEIGHT, Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP),
        OverlayEffect(listOf(BitmapOverlay.createStaticBitmapOverlay(overlay))),
      ),
    )

    // The clip is pre-baked to loop seamlessly, so repeating it and trimming the
    // last copy gives an exact-length background with no visible join.
    val background = MediaItem.fromUri(Uri.parse(options.backgroundUri))
    val items = mutableListOf<EditedMediaItem>()
    val loops = ceil(durationUs.toDouble() / clipUs).toInt().coerceAtLeast(1)
    var remaining = durationUs
    repeat(loops) {
      val take = min(remaining, clipUs)
      val clipped = background.buildUpon()
        .setClippingConfiguration(
          MediaItem.ClippingConfiguration.Builder().setEndPositionMs(take / 1000).build()
        )
        .build()
      items.add(
        EditedMediaItem.Builder(clipped)
          .setRemoveAudio(true)
          .setEffects(videoEffects)
          .build()
      )
      remaining -= take
    }
    val sequences = mutableListOf(EditedMediaItemSequence.withVideoFrom(items))

    val soundUri = options.soundUri
    if (!soundUri.isNullOrEmpty()) {
      val sound = EditedMediaItem.Builder(MediaItem.fromUri(Uri.parse(soundUri))).build()
      sequences.add(EditedMediaItemSequence.withAudioFrom(listOf(sound)).buildUpon().setIsLooping(true).build())
    }

    val fadeOutUs = min(FADE_OUT_US, durationUs / 3)
    val fades = GainProcessor(
      DefaultGainProvider.Builder(1f)
        .addFadeAt(0, min(FADE_IN_US, durationUs / 4), DefaultGainProvider.FADE_IN_EQUAL_POWER)
        .addFadeAt(durationUs - fadeOutUs, fadeOutUs, DefaultGainProvider.FADE_OUT_EQUAL_POWER)
        .build()
    )
    val composition = Composition.Builder(sequences)
      .setEffects(Effects(listOf(fades), emptyList()))
      // A silent story still carries an audio track: some apps refuse video without one.
      .experimentalSetForceAudioTrack(true)
      .build()

    val dir = File(context.cacheDir, "stories").apply { mkdirs() }
    dir.listFiles()?.filter { it.name.endsWith(".mp4") }?.forEach { it.delete() }
    val output = File(dir, "story-${System.currentTimeMillis()}.mp4")

    val transformer = Transformer.Builder(context)
      // The muxer aborts if one track goes this long without a sample. Video
      // encoding is slow on emulators and low-end phones while the audio track
      // finishes almost at once, so the 10 s default tripped a "Muxer error".
      .setMaxDelayBetweenMuxerSamplesMs(C.TIME_UNSET)
      .setVideoMimeType(MimeTypes.VIDEO_H264)
      .setAudioMimeType(MimeTypes.AUDIO_AAC)
      .setEncoderFactory(
        DefaultEncoderFactory.Builder(context)
          .setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(VIDEO_BITRATE).build())
          .build()
      )
      .addListener(object : Transformer.Listener {
        override fun onCompleted(composition: Composition, exportResult: ExportResult) {
          finish()
          promise.resolve(Uri.fromFile(output).toString())
        }

        override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
          finish()
          output.delete()
          Log.e(TAG, "Export failed (code ${exportException.errorCode})", exportException)
          promise.reject("ERR_COMPOSE", describe(exportException), exportException)
        }
      })
      .build()
    active = transformer
    transformer.start(composition, output.absolutePath)
    pollProgress(transformer)
  }

  /** The whole cause chain, so a device-specific failure is reportable from a screenshot. */
  private fun describe(e: Throwable): String {
    val parts = generateSequence(e) { it.cause }.take(4).mapNotNull { it.message }.distinct().toList()
    return parts.joinToString(" ← ").ifEmpty { "Could not render the video" }
  }

  private fun finish() {
    active = null
    main.removeCallbacksAndMessages(null)
  }

  private fun pollProgress(transformer: Transformer) {
    val holder = ProgressHolder()
    val tick = object : Runnable {
      override fun run() {
        if (active !== transformer) return
        if (transformer.getProgress(holder) == Transformer.PROGRESS_STATE_AVAILABLE) {
          sendEvent("onProgress", mapOf("progress" to holder.progress / 100.0))
        }
        main.postDelayed(this, PROGRESS_INTERVAL_MS)
      }
    }
    main.postDelayed(tick, PROGRESS_INTERVAL_MS)
  }

  /** The card PNG, scaled to exactly fill the frame if it was captured at another size. */
  private fun loadOverlay(uri: String): Bitmap {
    val path = Uri.parse(uri).path ?: throw IllegalArgumentException("Overlay path missing")
    val decoded = BitmapFactory.decodeFile(path) ?: throw IllegalArgumentException("Overlay could not be read")
    if (decoded.width == WIDTH && decoded.height == HEIGHT) return decoded
    return Bitmap.createScaledBitmap(decoded, WIDTH, HEIGHT, true)
  }

  private companion object {
    const val TAG = "VideoComposer"
    const val WIDTH = 1080
    const val HEIGHT = 1920
    const val VIDEO_BITRATE = 6_000_000
    const val FADE_IN_US = 800_000L
    const val FADE_OUT_US = 1_500_000L
    const val PROGRESS_INTERVAL_MS = 250L
  }
}
