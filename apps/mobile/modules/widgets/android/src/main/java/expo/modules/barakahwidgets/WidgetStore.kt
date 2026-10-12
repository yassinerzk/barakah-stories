package expo.modules.barakahwidgets

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** One prayer time the widget can show: its name, formatted clock time and instant. */
data class WidgetPrayer(val id: String, val name: String, val time: String, val at: Long)

/** The dhikr on the counter widget. */
data class WidgetDhikr(val arabic: String, val label: String, val count: Int, val target: Int)

/**
 * What the widgets draw, written by the app and read by the widgets even when
 * the app is not running. Kept in SharedPreferences on the phone; nothing leaves it.
 */
object WidgetStore {
  private const val PREFS = "barakah.widgets"
  private const val KEY_PRAYERS = "prayers"
  private const val KEY_PLACE = "place"
  private const val KEY_NEXT_LABEL = "nextLabel"
  private const val KEY_DHIKR = "dhikr"
  private const val KEY_TAPS = "pendingTaps"

  private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun savePrayers(c: Context, place: String, nextLabel: String, prayers: List<WidgetPrayer>) {
    val array = JSONArray()
    for (p in prayers) array.put(JSONObject().put("id", p.id).put("name", p.name).put("time", p.time).put("at", p.at))
    prefs(c).edit().putString(KEY_PRAYERS, array.toString()).putString(KEY_PLACE, place).putString(KEY_NEXT_LABEL, nextLabel).apply()
  }

  fun prayers(c: Context): List<WidgetPrayer> {
    val raw = prefs(c).getString(KEY_PRAYERS, null) ?: return emptyList()
    return try {
      val a = JSONArray(raw)
      (0 until a.length()).map { i ->
        val o = a.getJSONObject(i)
        WidgetPrayer(o.getString("id"), o.getString("name"), o.getString("time"), o.getLong("at"))
      }.sortedBy { it.at }
    } catch (e: Exception) {
      emptyList()
    }
  }

  fun place(c: Context): String = prefs(c).getString(KEY_PLACE, "") ?: ""
  fun nextLabel(c: Context): String = prefs(c).getString(KEY_NEXT_LABEL, "Next") ?: "Next"

  fun saveDhikr(c: Context, d: WidgetDhikr) {
    prefs(c).edit().putString(
      KEY_DHIKR,
      JSONObject().put("arabic", d.arabic).put("label", d.label).put("count", d.count).put("target", d.target).toString()
    ).apply()
  }

  fun dhikr(c: Context): WidgetDhikr? {
    val raw = prefs(c).getString(KEY_DHIKR, null) ?: return null
    return try {
      val o = JSONObject(raw)
      WidgetDhikr(o.getString("arabic"), o.getString("label"), o.getInt("count"), o.getInt("target"))
    } catch (e: Exception) {
      null
    }
  }

  /** A tap on the widget: one more in the round (a full round starts over) and one more for the app to collect. */
  fun tap(c: Context): WidgetDhikr? {
    val d = dhikr(c) ?: return null
    val next = d.copy(count = if (d.count >= d.target) 1 else d.count + 1)
    saveDhikr(c, next)
    val p = prefs(c)
    p.edit().putInt(KEY_TAPS, p.getInt(KEY_TAPS, 0) + 1).apply()
    return next
  }

  /** Taps made on the widget since the app last asked, cleared once read. */
  fun takeTaps(c: Context): Int {
    val p = prefs(c)
    val n = p.getInt(KEY_TAPS, 0)
    p.edit().putInt(KEY_TAPS, 0).apply()
    return n
  }
}
