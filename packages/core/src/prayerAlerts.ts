import { computePrayerTimes, type GeoPoint, type PrayerName, type PrayerSettings, type PrayerTime } from './prayer';

/**
 * Prayer alerts and the next-prayer panel, as pure functions.
 *
 * Everything here works in absolute instants. The prayer calculation already
 * returns real `Date`s, so an alert for Jakarta fires at Jakarta's Dhuhr even on
 * a phone set to London. Deriving an hour and minute and handing that to a daily
 * trigger would fire on the phone's clock instead — the bug this module exists
 * to make impossible.
 */

export type AlertPrayer = Exclude<PrayerName, 'sunrise'>;
export const ALERT_PRAYERS: readonly AlertPrayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** What a single prayer's alert does. */
export type AlertMode = 'adhan' | 'sound' | 'vibrate' | 'off';
export const ALERT_MODES: readonly AlertMode[] = ['adhan', 'sound', 'vibrate', 'off'];

export interface PrayerAlertPrefs {
  /** Master switch. Off until the user turns alerts on and grants permission. */
  enabled: boolean;
  modes: Readonly<Record<AlertPrayer, AlertMode>>;
  /** The dismissible next-prayer notification. */
  panel: boolean;
}

export const DEFAULT_ALERT_PREFS: PrayerAlertPrefs = {
  enabled: false,
  modes: { fajr: 'adhan', dhuhr: 'adhan', asr: 'adhan', maghrib: 'adhan', isha: 'adhan' },
  panel: true,
};

export function setPrayerMode(prefs: PrayerAlertPrefs, prayer: AlertPrayer, mode: AlertMode): PrayerAlertPrefs {
  return { ...prefs, modes: { ...prefs.modes, [prayer]: mode } };
}

/**
 * iOS keeps only the 64 soonest pending notifications and silently drops the
 * rest. 60 leaves room for the daily reminder and a test alert, and is twelve
 * days of five prayers — the app re-plans long before that runs out.
 */
export const MAX_SCHEDULED_ALERTS = 60;
export const DEFAULT_PLAN_DAYS = 12;
const DAY_MS = 86_400_000;

export interface PlannedAlert {
  /** Stable for the same prayer instant, so re-planning is idempotent. */
  id: string;
  prayer: AlertPrayer;
  at: Date;
  mode: Exclude<AlertMode, 'off'>;
}

/**
 * Every prayer instant from a day before `from` to `days + 1` after, sorted and
 * de-duplicated.
 *
 * The calculation works on the device's civil day. For a city in another time
 * zone that day and the city's day disagree, so the span is padded on both sides
 * and de-duplicated by instant — nothing is double-counted and nothing falls
 * through the gap between two days.
 */
function prayerInstants(point: GeoPoint, settings: PrayerSettings, from: Date, days: number): PrayerTime[] {
  const seen = new Map<number, PrayerTime>();
  for (let offset = -1; offset <= days + 1; offset++) {
    const day = new Date(from);
    day.setDate(day.getDate() + offset);
    for (const t of computePrayerTimes(point, day, settings)) {
      if (t.id === 'sunrise') continue;
      seen.set(t.time.getTime(), t);
    }
  }
  return [...seen.values()].sort((a, b) => a.time.getTime() - b.time.getTime());
}

export interface PlanAlertsInput {
  point: GeoPoint;
  settings: PrayerSettings;
  prefs: PrayerAlertPrefs;
  now: Date;
  days?: number;
}

/** The notifications to schedule: future prayers, not switched off, capped. */
export function planAlerts({ point, settings, prefs, now, days = DEFAULT_PLAN_DAYS }: PlanAlertsInput): PlannedAlert[] {
  if (!prefs.enabled) return [];
  const start = now.getTime();
  const end = start + days * DAY_MS;
  const plan: PlannedAlert[] = [];
  for (const t of prayerInstants(point, settings, now, days)) {
    const at = t.time.getTime();
    if (at <= start || at > end) continue;
    const prayer = t.id as AlertPrayer;
    const mode = prefs.modes[prayer];
    if (mode === 'off') continue;
    plan.push({ id: `prayer.${prayer}.${at}`, prayer, at: t.time, mode });
    if (plan.length === MAX_SCHEDULED_ALERTS) break;
  }
  return plan;
}

/** How long a prayer stays on the panel as "now" after it begins. */
export const PANEL_CURRENT_WINDOW_MS = 30 * 60_000;

export interface PanelState {
  /** The prayer that began less than 30 minutes ago, if any. */
  current: PrayerTime | null;
  next: PrayerTime;
}

export function panelState(point: GeoPoint, settings: PrayerSettings, now: Date): PanelState {
  const t = now.getTime();
  const all = prayerInstants(point, settings, now, 1);
  const nextIndex = all.findIndex((p) => p.time.getTime() > t);
  const next = all[nextIndex];
  const previous = nextIndex > 0 ? all[nextIndex - 1] : null;
  const current = previous && t - previous.time.getTime() < PANEL_CURRENT_WINDOW_MS ? previous : null;
  return { current, next };
}

export interface PanelEntry extends PanelState {
  /** When the panel should switch to this content. */
  at: Date;
}

/**
 * The panel's timeline: what it shows now, then every moment it must change —
 * when a prayer begins, and 30 minutes later when only the next one remains.
 * The native side posts each entry at its time; the countdown in between is
 * drawn by the system.
 */
export function planPanel(point: GeoPoint, settings: PrayerSettings, now: Date, days: number): PanelEntry[] {
  const start = now.getTime();
  const end = start + days * DAY_MS;
  const moments = new Set<number>();
  for (const p of prayerInstants(point, settings, now, days)) {
    const begin = p.time.getTime();
    for (const m of [begin, begin + PANEL_CURRENT_WINDOW_MS]) if (m > start && m <= end) moments.add(m);
  }
  const at = [start, ...[...moments].sort((a, b) => a - b)];
  return at.map((ms) => ({ at: new Date(ms), ...panelState(point, settings, new Date(ms)) }));
}
