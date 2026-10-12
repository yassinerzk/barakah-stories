package expo.modules.barakahwidgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews

/**
 * Next prayer with a live countdown, and the day's times. The countdown is a
 * system Chronometer, so it ticks on the home screen without waking the app;
 * the widget only redraws when a prayer time passes.
 */
class PrayerWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    for (id in ids) manager.updateAppWidget(id, render(context))
    scheduleNext(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == ACTION_REFRESH) {
      refreshAll(context)
      return
    }
    super.onReceive(context, intent)
  }

  companion object {
    const val ACTION_REFRESH = "expo.modules.barakahwidgets.PRAYER_REFRESH"
    private const val GOLD = 0xFFD9B65C.toInt()
    private const val IVORY = 0xFFF3EFE4.toInt()
    private const val MUTED = 0xFFA9B8B1.toInt()
    private val ROW_NAMES = intArrayOf(R.id.barakah_p0_name, R.id.barakah_p1_name, R.id.barakah_p2_name, R.id.barakah_p3_name, R.id.barakah_p4_name, R.id.barakah_p5_name)
    private val ROW_TIMES = intArrayOf(R.id.barakah_p0_time, R.id.barakah_p1_time, R.id.barakah_p2_time, R.id.barakah_p3_time, R.id.barakah_p4_time, R.id.barakah_p5_time)

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, PrayerWidget::class.java))
      for (id in ids) manager.updateAppWidget(id, render(context))
      if (ids.isNotEmpty()) scheduleNext(context)
    }

    private fun render(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.barakah_widget_prayer)
      openAppOnTap(context, views, R.id.barakah_prayer_root)
      val now = System.currentTimeMillis()
      val all = WidgetStore.prayers(context)
      val next = all.firstOrNull { it.at > now && it.id != "sunrise" }
      if (next == null) {
        views.setTextViewText(R.id.barakah_next_label, "")
        views.setTextViewText(R.id.barakah_next_time, "")
        views.setViewVisibility(R.id.barakah_countdown, View.GONE)
        views.setTextViewText(R.id.barakah_place, context.getString(R.string.barakah_widget_open_app))
        return views
      }
      views.setTextViewText(R.id.barakah_next_label, "${WidgetStore.nextLabel(context)} · ${next.name}")
      views.setTextViewText(R.id.barakah_next_time, next.time)
      views.setTextViewText(R.id.barakah_place, WidgetStore.place(context))
      views.setViewVisibility(R.id.barakah_countdown, View.VISIBLE)
      views.setChronometer(R.id.barakah_countdown, SystemClock.elapsedRealtime() + (next.at - now), null, true)
      views.setChronometerCountDown(R.id.barakah_countdown, true)

      // The six times of the day the next prayer belongs to.
      val dayStart = all.indexOfLast { it.at <= next.at && it.id == "fajr" }.coerceAtLeast(0)
      val day = all.drop(dayStart).take(6)
      for (i in ROW_NAMES.indices) {
        val p = day.getOrNull(i)
        val isNext = p != null && p.at == next.at
        views.setTextViewText(ROW_NAMES[i], p?.name ?: "")
        views.setTextViewText(ROW_TIMES[i], p?.time ?: "")
        views.setTextColor(ROW_NAMES[i], if (isNext) GOLD else MUTED)
        views.setTextColor(ROW_TIMES[i], if (isNext) GOLD else IVORY)
      }
      return views
    }

    /** Redraw when the next prayer arrives. Inexact is fine: the countdown itself is exact. */
    private fun scheduleNext(context: Context) {
      val now = System.currentTimeMillis()
      val next = WidgetStore.prayers(context).firstOrNull { it.at > now } ?: return
      val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val pi = PendingIntent.getBroadcast(
        context,
        7101,
        Intent(context, PrayerWidget::class.java).setAction(ACTION_REFRESH),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      val at = next.at + 1_000
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarm.canScheduleExactAlarms()) {
        alarm.setWindow(AlarmManager.RTC, at, 60_000, pi)
      } else {
        alarm.setExactAndAllowWhileIdle(AlarmManager.RTC, at, pi)
      }
    }
  }
}

/** Tapping the widget (outside any button) opens the app. */
internal fun openAppOnTap(context: Context, views: RemoteViews, viewId: Int) {
  val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
  val pi = PendingIntent.getActivity(context, 7100, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  views.setOnClickPendingIntent(viewId, pi)
}
