import { sunArc } from './sunArc';
import { computePrayerTimes, type PrayerTime } from './prayer';

const makkah = { lat: 21.4225, lng: 39.8262 };
const settings = { method: 'UmmAlQura', madhab: 'shafi' } as const;
const day = new Date(Date.UTC(2026, 8, 18, 9)); // 12:00 in Makkah

function times(): PrayerTime[] {
  return computePrayerTimes(makkah, day, settings);
}
const at = (id: string) => times().find((t) => t.id === id)!.time;
const shift = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

describe('sunArc', () => {
  it('places Fajr at the start of the arc and Isha at the end', () => {
    const arc = sunArc(times(), day);
    expect(arc.markers[0]).toMatchObject({ id: 'fajr', t: 0 });
    expect(arc.markers[5]).toMatchObject({ id: 'isha', t: 1 });
  });

  it('places the markers in order along the arc, by time', () => {
    const ts = sunArc(times(), day).markers.map((m) => m.t);
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
  });

  it('puts the sun on Dhuhr at Dhuhr and calls it day', () => {
    const arc = sunArc(times(), at('dhuhr'));
    const dhuhr = arc.markers.find((m) => m.id === 'dhuhr')!;
    expect(arc.t).toBeCloseTo(dhuhr.t, 5);
    expect(arc.isNight).toBe(false);
  });

  it('is night between Fajr and sunrise, and between Maghrib and Isha', () => {
    expect(sunArc(times(), shift(at('fajr'), 5)).isNight).toBe(true);
    expect(sunArc(times(), shift(at('maghrib'), 5)).isNight).toBe(true);
    expect(sunArc(times(), shift(at('sunrise'), 5)).isNight).toBe(false);
  });

  it('rests at the start before Fajr and at the end after Isha', () => {
    expect(sunArc(times(), shift(at('fajr'), -60))).toMatchObject({ t: 0, isNight: true });
    expect(sunArc(times(), shift(at('isha'), 60))).toMatchObject({ t: 1, isNight: true });
  });

  it('marks the current prayer: the latest one that has started', () => {
    expect(sunArc(times(), shift(at('asr'), 1)).current).toBe('asr');
    expect(sunArc(times(), shift(at('sunrise'), 1)).current).toBe('sunrise');
    expect(sunArc(times(), shift(at('fajr'), -1)).current).toBeNull();
  });

  it('survives invalid times by dropping them instead of returning NaN', () => {
    const broken = times().map((p) => (p.id === 'isha' ? { ...p, time: new Date(NaN) } : p));
    const arc = sunArc(broken, at('dhuhr'));
    expect(arc.markers.map((m) => m.id)).not.toContain('isha');
    expect(Number.isFinite(arc.t)).toBe(true);
    for (const m of arc.markers) expect(Number.isFinite(m.t)).toBe(true);
  });

  it('returns an empty arc when fewer than two times are valid', () => {
    const arc = sunArc([], day);
    expect(arc).toEqual({ t: 0, isNight: true, current: null, markers: [] });
  });
});
