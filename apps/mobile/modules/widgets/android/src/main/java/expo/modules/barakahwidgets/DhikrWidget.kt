package expo.modules.barakahwidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.widget.RemoteViews

/**
 * A tasbih on the home screen: tap to count without opening the app. Taps are
 * kept on the phone and handed to the app's tasbih the next time it opens, so
 * both always show the same totals.
 */
class DhikrWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    for (id in ids) manager.updateAppWidget(id, render(context))
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == ACTION_TAP) {
      val d = WidgetStore.tap(context)
      if (d != null) buzz(context, d.count >= d.target)
      refreshAll(context)
      return
    }
    super.onReceive(context, intent)
  }

  companion object {
    const val ACTION_TAP = "expo.modules.barakahwidgets.DHIKR_TAP"

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, DhikrWidget::class.java))
      for (id in ids) manager.updateAppWidget(id, render(context))
    }

    private fun render(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.barakah_widget_dhikr)
      val d = WidgetStore.dhikr(context)
      if (d == null) {
        views.setTextViewText(R.id.barakah_dhikr_arabic, "سُبْحَانَ ٱللَّٰهِ")
        views.setTextViewText(R.id.barakah_dhikr_count, "0")
        views.setTextViewText(R.id.barakah_dhikr_label, context.getString(R.string.barakah_widget_open_app))
      } else {
        views.setTextViewText(R.id.barakah_dhikr_arabic, d.arabic)
        views.setTextViewText(R.id.barakah_dhikr_count, if (d.count >= d.target) "✓ ${d.target}" else "${d.count} / ${d.target}")
        views.setTextViewText(R.id.barakah_dhikr_label, d.label)
      }
      val tap = PendingIntent.getBroadcast(
        context,
        7102,
        Intent(context, DhikrWidget::class.java).setAction(ACTION_TAP),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.barakah_dhikr_root, tap)
      openAppOnTap(context, views, R.id.barakah_dhikr_open)
      return views
    }

    private fun buzz(context: Context, done: Boolean) {
      val v = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
      if (!v.hasVibrator()) return
      val ms = if (done) 120L else 12L
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
      } else {
        @Suppress("DEPRECATION")
        v.vibrate(ms)
      }
    }
  }
}
