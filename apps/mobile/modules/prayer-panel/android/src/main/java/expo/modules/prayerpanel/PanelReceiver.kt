package expo.modules.prayerpanel

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Runs at each panel change, and after boot, an app update or a clock change —
 * the cases in which Android drops pending alarms or the shown time goes stale.
 */
class PanelReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      PanelNotifier.ACTION_UPDATE,
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED -> PanelNotifier.refresh(context)
    }
  }
}
