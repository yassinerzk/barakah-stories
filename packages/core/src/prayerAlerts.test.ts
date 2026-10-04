import {
  ALERT_PRAYERS,
  DEFAULT_ALERT_PREFS,
  MAX_SCHEDULED_ALERTS,
  PANEL_CURRENT_WINDOW_MS,
  panelState,
  planAlerts,
  planPanel,
  setPrayerMode,
  type PrayerAlertPrefs,
} from './prayerAlerts';
import { computePrayerTimes } from './prayer';

const makkah = { lat: 21.4225, lng: 39.8262 };
const jakarta = { lat: -6.2088, lng: 106.8456 };
const london = { lat: 51.5074, lng: -0.1278 };
const settings = { method: 'UmmAlQura', madhab: 'shafi' } as const;
const noon = new Date(Date.UTC(2026, 8, 18, 9)); // 12:00 in Makkah

const allOn: PrayerAlertPrefs = { ...DEFAULT_ALERT_PREFS, enabled: true };

function today(point = makkah, at = noon) {
  return computePrayerTimes(point, at, settings).filter((t) => t.id !== 'sunrise');
}

describe('alert prefs', () => {
  it('starts switched off, with adhan ready for every prayer and the panel on', () => {
    expect(DEFAULT_ALERT_PREFS.enabled).toBe(false);
    expect(DEFAULT_ALERT_PREFS.panel).toBe(true);
    for (const p of ALERT_PRAYERS) expect(DEFAULT_ALERT_PREFS.modes[p]).toBe('adhan');
  });

  it('changes one prayer without touching the others or the original', () => {
    const next = setPrayerMode(DEFAULT_ALERT_PREFS, 'asr', 'vibrate');
    expect(next.modes.asr).toBe('vibrate');
    expect(next.modes.dhuhr).toBe('adhan');
    expect(DEFAULT_ALERT_PREFS.modes.asr).toBe('adhan');
    expect(next).not.toBe(DEFAULT_ALERT_PREFS);
  });
});

describe('planAlerts', () => {
  it('plans nothing while alerts are switched off', () => {
    expect(planAlerts({ point: makkah, settings, prefs: DEFAULT_ALERT_PREFS, now: noon })).toEqual([]);
  });

  it('plans only future prayers, in order, never sunrise', () => {
    const plan = planAlerts({ point: makkah, settings, prefs: allOn, now: noon, days: 2 });
    expect(plan.length).toBeGreaterThan(0);
    for (const item of plan) {
      expect(item.at.getTime()).toBeGreaterThan(noon.getTime());
      expect(ALERT_PRAYERS).toContain(item.prayer);
    }
    for (let i = 1; i < plan.length; i++)
      expect(plan[i].at.getTime()).toBeGreaterThan(plan[i - 1].at.getTime());
  });

  it('starts with the first prayer still to come today', () => {
    const plan = planAlerts({ point: makkah, settings, prefs: allOn, now: noon, days: 1 });
    const upcoming = today().find((t) => t.time.getTime() > noon.getTime())!;
    expect(plan[0].prayer).toBe(upcoming.id);
    expect(plan[0].at.getTime()).toBe(upcoming.time.getTime());
  });

  it('skips prayers set to off and carries each mode through', () => {
    let prefs = setPrayerMode(allOn, 'asr', 'off');
    prefs = setPrayerMode(prefs, 'maghrib', 'vibrate');
    const plan = planAlerts({ point: makkah, settings, prefs, now: noon, days: 3 });
    expect(plan.some((p) => p.prayer === 'asr')).toBe(false);
    expect(plan.filter((p) => p.prayer === 'maghrib').every((p) => p.mode === 'vibrate')).toBe(true);
  });

  it('never exceeds the iOS-safe ceiling of scheduled notifications', () => {
    const plan = planAlerts({ point: makkah, settings, prefs: allOn, now: noon, days: 30 });
    expect(plan.length).toBe(MAX_SCHEDULED_ALERTS);
    expect(MAX_SCHEDULED_ALERTS).toBeLessThanOrEqual(60);
  });

  it('gives every alert a unique, stable id', () => {
    const a = planAlerts({ point: makkah, settings, prefs: allOn, now: noon, days: 3 });
    const b = planAlerts({ point: makkah, settings, prefs: allOn, now: noon, days: 3 });
    expect(new Set(a.map((p) => p.id)).size).toBe(a.length);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
    for (const p of a) expect(p.id.startsWith('prayer.')).toBe(true);
  });

  it('plans five alerts a day with no duplicates or gaps for a city far from the device', () => {
    // Jakarta is UTC+7: its prayers straddle the device's day boundary for most of
    // the world, which is where a day-by-day loop double-counts or drops one.
    const now = new Date(Date.UTC(2026, 8, 18, 0));
    const plan = planAlerts({ point: jakarta, settings, prefs: allOn, now, days: 4 });
    const window = plan.filter((p) => p.at.getTime() < now.getTime() + 3 * 86_400_000);
    expect(window.length).toBe(15);
    expect(new Set(window.map((p) => p.at.getTime())).size).toBe(15);
  });

  it('survives a daylight-saving change without dropping or repeating a prayer', () => {
    // UK clocks go back on 25 October 2026.
    const now = new Date(Date.UTC(2026, 9, 23, 12));
    const plan = planAlerts({ point: london, settings, prefs: allOn, now, days: 5 });
    const isha = plan.filter((p) => p.prayer === 'isha');
    const gaps = isha.slice(1).map((p, i) => p.at.getTime() - isha[i].at.getTime());
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(22 * 3_600_000);
      expect(gap).toBeLessThan(26 * 3_600_000);
    }
  });
});

describe('panelState', () => {
  const times = today();
  const dhuhr = times.find((t) => t.id === 'dhuhr')!;
  const asr = times.find((t) => t.id === 'asr')!;

  it('shows the current prayer and the next one inside the 30-minute window', () => {
    const s = panelState(makkah, settings, new Date(dhuhr.time.getTime() + 10 * 60_000));
    expect(s.current?.id).toBe('dhuhr');
    expect(s.next.id).toBe('asr');
  });

  it('drops the current prayer once it is more than 30 minutes old', () => {
    const s = panelState(makkah, settings, new Date(dhuhr.time.getTime() + PANEL_CURRENT_WINDOW_MS + 1));
    expect(s.current).toBeNull();
    expect(s.next.id).toBe('asr');
  });

  it('shows exactly at the moment a prayer begins', () => {
    const s = panelState(makkah, settings, new Date(asr.time.getTime()));
    expect(s.current?.id).toBe('asr');
  });

  it('rolls from Isha to the next day’s Fajr', () => {
    const isha = times.find((t) => t.id === 'isha')!;
    const s = panelState(makkah, settings, new Date(isha.time.getTime() + 2 * 3_600_000));
    expect(s.current).toBeNull();
    expect(s.next.id).toBe('fajr');
    expect(s.next.time.getTime()).toBeGreaterThan(isha.time.getTime());
  });
});

describe('planPanel', () => {
  it('starts with the state right now and then changes at each prayer and 30 minutes after', () => {
    const plan = planPanel(makkah, settings, noon, 1);
    expect(plan[0].at.getTime()).toBe(noon.getTime());
    const kinds = plan.slice(1).map((e) => (e.current ? 'begin' : 'expire'));
    // Alternates: a prayer begins, then 30 minutes later only the next one shows.
    for (let i = 1; i < kinds.length; i++) expect(kinds[i]).not.toBe(kinds[i - 1]);
  });

  it('changes in strictly increasing time and each entry matches panelState at that moment', () => {
    const plan = planPanel(jakarta, settings, noon, 2);
    for (let i = 1; i < plan.length; i++)
      expect(plan[i].at.getTime()).toBeGreaterThan(plan[i - 1].at.getTime());
    for (const e of plan) {
      const s = panelState(jakarta, settings, e.at);
      expect(e.current?.id ?? null).toBe(s.current?.id ?? null);
      expect(e.next.id).toBe(s.next.id);
    }
  });

  it('covers about ten changes a day', () => {
    const plan = planPanel(makkah, settings, noon, 3);
    expect(plan.length).toBeGreaterThanOrEqual(28);
    expect(plan.length).toBeLessThanOrEqual(32);
  });
});
