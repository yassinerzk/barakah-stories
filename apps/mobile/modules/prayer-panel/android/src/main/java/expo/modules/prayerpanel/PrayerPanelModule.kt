package expo.modules.prayerpanel

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class PanelEntryRecord : Record {
  @Field val at: Double = 0.0
  @Field val title: String = ""
  @Field val body: String = ""
  @Field val countdownTo: Double = 0.0
}

/**
 * The two things expo-notifications cannot do: a counting-down panel, and
 * checking or requesting the exact-alarm grant Android 14+ withholds by default.
 */
class PrayerPanelModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PrayerPanel")

    Function("canScheduleExactAlarms") {
      PanelNotifier.canScheduleExact(context)
    }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function false
      open(
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
      )
    }

    // The battery-optimisation list. Needs no permission — unlike asking for an
    // exemption directly, which Play restricts.
    Function("openBatterySettings") {
      open(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }

    Function("setPanel") { entries: List<PanelEntryRecord>, channelName: String ->
      val parsed = entries
        .map { PanelEntry(it.at.toLong(), it.title, it.body, it.countdownTo.toLong()) }
        .sortedBy { it.at }
      PanelStore.save(context, parsed, channelName)
      PanelNotifier.refresh(context)
    }

    Function("clearPanel") {
      PanelNotifier.clear(context)
    }
  }

  /** Opens a settings screen, falling back to the app's own settings page. */
  private fun open(intent: Intent): Boolean {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return try {
      context.startActivity(intent)
      true
    } catch (e: ActivityNotFoundException) {
      try {
        context.startActivity(
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        true
      } catch (e2: ActivityNotFoundException) {
        false
      }
    }
  }
}
