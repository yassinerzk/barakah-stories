package expo.modules.barakahwidgets

import android.app.WallpaperManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class PrayerRecord : Record {
  @Field val id: String = ""
  @Field val name: String = ""
  @Field val time: String = ""
  @Field val at: Double = 0.0
}

class DhikrRecord : Record {
  @Field val arabic: String = ""
  @Field val label: String = ""
  @Field val count: Int = 0
  @Field val target: Int = 33
}

/** The app's side of the widgets: hand them data, collect widget taps, offer to pin one. */
class BarakahWidgetsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("BarakahWidgets")

    Function("setPrayers") { place: String, nextLabel: String, prayers: List<PrayerRecord> ->
      WidgetStore.savePrayers(context, place, nextLabel, prayers.map { WidgetPrayer(it.id, it.name, it.time, it.at.toLong()) })
      PrayerWidget.refreshAll(context)
    }

    Function("setDhikr") { d: DhikrRecord ->
      WidgetStore.saveDhikr(context, WidgetDhikr(d.arabic, d.label, d.count, d.target))
      DhikrWidget.refreshAll(context)
    }

    Function("takeTaps") {
      WidgetStore.takeTaps(context)
    }

    Function("canPin") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && AppWidgetManager.getInstance(context).isRequestPinAppWidgetSupported
    }

    // Asks the launcher to add the widget; it shows its own confirmation.
    Function("requestPin") { kind: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      val manager = AppWidgetManager.getInstance(context)
      if (!manager.isRequestPinAppWidgetSupported) return@Function false
      val provider = if (kind == "dhikr") DhikrWidget::class.java else PrayerWidget::class.java
      manager.requestPinAppWidget(ComponentName(context, provider), null, null)
    }

    // Wallpapers screen. SET_WALLPAPER is a normal permission: granted at install, never a prompt.
    Function("canSetWallpaper") {
      val manager = WallpaperManager.getInstance(context)
      manager.isWallpaperSupported && manager.isSetWallpaperAllowed
    }

    // `uri` is the picture the app just drew (a file in its own cache); `target` is home, lock or both.
    AsyncFunction("setWallpaper") { uri: String, target: String ->
      val manager = WallpaperManager.getInstance(context)
      val which = when (target) {
        "home" -> WallpaperManager.FLAG_SYSTEM
        "lock" -> WallpaperManager.FLAG_LOCK
        else -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
      }
      val stream = context.contentResolver.openInputStream(Uri.parse(uri)) ?: return@AsyncFunction false
      // setStream returns the new wallpaper's id, or 0 when the system refused it.
      stream.use { manager.setStream(it, null, true, which) } != 0
    }
  }
}
