package expo.modules.prayerpanel

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** One state of the panel: shown from `at` until the next entry, counting down to `countdownTo`. */
data class PanelEntry(val at: Long, val title: String, val body: String, val countdownTo: Long)

/**
 * The panel's timeline, kept on the device so the receiver can show the right
 * content after a reboot or when the app is not running. Nothing leaves the phone.
 */
object PanelStore {
  private const val PREFS = "barakah.prayerPanel"
  private const val KEY_ENTRIES = "entries"
  private const val KEY_CHANNEL = "channelName"

  fun save(context: Context, entries: List<PanelEntry>, channelName: String) {
    val array = JSONArray()
    for (e in entries) {
      array.put(
        JSONObject()
          .put("at", e.at)
          .put("title", e.title)
          .put("body", e.body)
          .put("countdownTo", e.countdownTo)
      )
    }
    prefs(context).edit()
      .putString(KEY_ENTRIES, array.toString())
      .putString(KEY_CHANNEL, channelName)
      .apply()
  }

  fun load(context: Context): List<PanelEntry> {
    val raw = prefs(context).getString(KEY_ENTRIES, null) ?: return emptyList()
    return try {
      val array = JSONArray(raw)
      (0 until array.length()).map { i ->
        val o = array.getJSONObject(i)
        PanelEntry(o.getLong("at"), o.getString("title"), o.getString("body"), o.getLong("countdownTo"))
      }
    } catch (e: Exception) {
      // A corrupt store must not crash a boot receiver; an empty panel is the safe state.
      emptyList()
    }
  }

  fun channelName(context: Context): String =
    prefs(context).getString(KEY_CHANNEL, null) ?: "Next prayer"

  fun clear(context: Context) {
    prefs(context).edit().clear().apply()
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
