import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Compass heading in degrees (0 = North), or null when unavailable. Uses the
 * true heading when the platform provides one, otherwise magnetic.
 *
 * Starts only if location permission is already granted — it never prompts.
 * Bump `attempt` after the user grants permission to start it straight away.
 */
export function useHeading(enabled: boolean, attempt = 0): number | null {
  const [heading, setHeading] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let cancelled = false;
    let sub: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      sub = await Location.watchHeadingAsync((h) => {
        const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        if (!cancelled && Number.isFinite(value)) setHeading(value);
      });
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled, attempt]);
  return heading;
}
