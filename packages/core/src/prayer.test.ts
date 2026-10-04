import { computePrayerTimes, nextPrayer, qiblaBearing, splitCountdown, PRAYER_NAMES } from './prayer';
import { CITIES } from './cities';

const makkah = { lat: 21.4225, lng: 39.8262 };
const settings = { method: 'UmmAlQura', madhab: 'shafi' } as const;

describe('prayer', () => {
  it('returns six times in chronological order', () => {
    const times = computePrayerTimes(makkah, new Date(2026, 8, 18, 12), settings);
    expect(times.map((t) => t.id)).toEqual(PRAYER_NAMES.map((p) => p.id));
    for (let i = 1; i < times.length; i++)
      expect(times[i].time.getTime()).toBeGreaterThan(times[i - 1].time.getTime());
  });

  it('picks the next prayer and skips sunrise', () => {
    const noon = new Date(2026, 8, 18, 12);
    const times = computePrayerTimes(makkah, noon, settings);
    const justAfterFajr = new Date(times[0].time.getTime() + 60_000);
    expect(nextPrayer(makkah, justAfterFajr, settings).id).toBe('dhuhr');
  });

  it("rolls over to tomorrow's Fajr after Isha", () => {
    const noon = new Date(2026, 8, 18, 12);
    const isha = computePrayerTimes(makkah, noon, settings).find((t) => t.id === 'isha')!;
    const next = nextPrayer(makkah, new Date(isha.time.getTime() + 60_000), settings);
    expect(next.id).toBe('fajr');
    expect(next.time.getTime()).toBeGreaterThan(isha.time.getTime());
  });

  it('computes the Qibla bearing', () => {
    expect(qiblaBearing({ lat: 51.5074, lng: -0.1278 })).toBeCloseTo(119, 0); // London
    expect(qiblaBearing({ lat: 40.7128, lng: -74.006 })).toBeCloseTo(58.5, 0); // New York
    expect(qiblaBearing({ lat: -6.2088, lng: 106.8456 })).toBeCloseTo(295, 0); // Jakarta
  });

  it('names every prayer in every app language, since alerts show the name', () => {
    for (const p of PRAYER_NAMES)
      for (const loc of ['en', 'ar', 'fr', 'id', 'ms', 'th', 'ur'] as const)
        expect(p.label[loc], `${p.id} ${loc}`).toBeTruthy();
  });

  it('splits countdowns', () => {
    expect(splitCountdown(95 * 60_000)).toEqual({ hours: 1, minutes: 35 });
    expect(splitCountdown(-5)).toEqual({ hours: 0, minutes: 0 });
  });

  it('has unique preset cities with valid coordinates', () => {
    const ids = CITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CITIES) {
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lng)).toBeLessThanOrEqual(180);
      expect(() => new Intl.DateTimeFormat('en', { timeZone: c.timeZone })).not.toThrow();
    }
  });
});
