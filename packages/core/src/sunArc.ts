import type { PrayerName, PrayerTime } from './prayer';

export interface SunArcMarker {
  id: PrayerName;
  /** Position along the arc, 0 = Fajr (start) … 1 = Isha (end). */
  t: number;
}

export interface SunArc {
  /** Where the sun (or moon) sits on the arc, 0..1. */
  t: number;
  /** Before sunrise or after Maghrib: draw the moon, not the sun. */
  isNight: boolean;
  /** Which sky to paint: Fajr→sunrise, sunrise→Maghrib, Maghrib→Isha, otherwise night. */
  phase: DayPhase;
  /** The latest time that has started (sunrise included), or null before Fajr. */
  current: PrayerName | null;
  /** How many of the day's times have already started. */
  passed: number;
  markers: SunArcMarker[];
}

export type DayPhase = 'dawn' | 'day' | 'evening' | 'night';

const EMPTY: SunArc = { t: 0, isNight: true, phase: 'night', current: null, passed: 0, markers: [] };

/**
 * The prayer-screen arc: the day's times laid along it by time, Fajr at the
 * start and Isha at the end, and where "now" falls between them. Outside that
 * span the moon rests at whichever end is nearer. Invalid times (which the
 * polar fallbacks should prevent, but never trust) are dropped, so the drawing
 * never receives NaN.
 */
export function sunArc(times: readonly PrayerTime[], now: Date): SunArc {
  const valid = times
    .filter((p) => Number.isFinite(p.time.getTime()))
    .slice()
    .sort((a, b) => a.time.getTime() - b.time.getTime());
  if (valid.length < 2) return EMPTY;

  const start = valid[0].time.getTime();
  const span = valid[valid.length - 1].time.getTime() - start;
  if (span <= 0) return EMPTY;

  const at = (ms: number) => Math.min(1, Math.max(0, (ms - start) / span));
  const markers = valid.map((p) => ({ id: p.id, t: at(p.time.getTime()) }));

  const nowMs = now.getTime();
  const started = valid.filter((p) => p.time.getTime() <= nowMs);
  const current = started.length ? started[started.length - 1].id : null;

  const timeOf = (id: PrayerName) => valid.find((p) => p.id === id)?.time.getTime();
  const between = (from: PrayerName, to: PrayerName) => {
    const a = timeOf(from);
    const b = timeOf(to);
    return a !== undefined && b !== undefined && nowMs >= a && nowMs < b;
  };
  const phase: DayPhase = between('sunrise', 'maghrib')
    ? 'day'
    : between('fajr', 'sunrise')
      ? 'dawn'
      : between('maghrib', 'isha')
        ? 'evening'
        : 'night';

  return { t: at(nowMs), isNight: phase !== 'day', phase, current, passed: started.length, markers };
}
