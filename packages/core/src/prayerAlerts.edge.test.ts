import { DEFAULT_ALERT_PREFS, panelState, planAlerts, planPanel } from './prayerAlerts';
import { DICTIONARIES, type TranslationKey } from './i18n';

/**
 * Edge cases that the logic review was asked to check: places where the sun
 * barely sets, and translations whose placeholders the app fills at runtime.
 */

const settings = { method: 'MuslimWorldLeague', madhab: 'shafi' } as const;
const allOn = { ...DEFAULT_ALERT_PREFS, enabled: true };

describe('high latitudes', () => {
  // Tromsø in midsummer: the sun never sets, so Fajr and Isha may not exist.
  const tromso = { lat: 69.6496, lng: 18.956 };
  const midsummer = new Date(Date.UTC(2026, 5, 21, 12));

  it('never schedules an alert at an invalid time', () => {
    const plan = planAlerts({ point: tromso, settings, prefs: allOn, now: midsummer, days: 3 });
    for (const p of plan) expect(Number.isFinite(p.at.getTime()), `${p.prayer}`).toBe(true);
  });

  it('never gives the panel an invalid countdown', () => {
    for (const e of planPanel(tromso, settings, midsummer, 2)) {
      expect(Number.isFinite(e.at.getTime())).toBe(true);
      expect(Number.isFinite(e.next.time.getTime())).toBe(true);
    }
    expect(Number.isFinite(panelState(tromso, settings, midsummer).next.time.getTime())).toBe(true);
  });
});

describe('alert and panel templates', () => {
  const templates: TranslationKey[] = [
    'prayerNotifTitle',
    'prayerNotifBody',
    'panelNext',
    'panelNow',
    'qiblaTurnLeft',
    'qiblaTurnRight',
    'qiblaCompassLabel',
  ];
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it.each(templates)('%s carries the same placeholders in every language', (key) => {
    const expected = placeholders(DICTIONARIES.en[key]);
    expect(expected.length).toBeGreaterThan(0);
    for (const [loc, dict] of Object.entries(DICTIONARIES)) {
      expect(placeholders(dict[key]), `${loc}.${key}`).toEqual(expected);
    }
  });
});
