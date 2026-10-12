import { useEffect, useMemo, useState } from 'react';
import { computePrayerTimes, nextPrayer, qiblaBearing, splitCountdown } from '@barakah/core';
import { usePrayerStore } from '../../store';

/** Today's prayer times, the next prayer with a live countdown, and the Qibla. */
export function usePrayerTimes() {
  const location = usePrayerStore((s) => s.location);
  const method = usePrayerStore((s) => s.method);
  const madhab = usePrayerStore((s) => s.madhab);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    if (!location) return { location: null, times: [], next: null, countdown: null, qibla: null, now };
    const settings = { method, madhab };
    const times = computePrayerTimes(location, now, settings);
    const next = nextPrayer(location, now, settings);
    return {
      location,
      times,
      next,
      countdown: splitCountdown(next.time.getTime() - now.getTime()),
      qibla: qiblaBearing(location),
      now,
    };
  }, [location, method, madhab, now]);
}
