import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { PrayerLocation } from '../../store';

export type LocateResult = { ok: true; location: PrayerLocation } | { ok: false; reason: 'denied' | 'failed' };

/**
 * Asks for foreground location (only when the user tapped "Use my location"),
 * reads one position and names it. The position never leaves the phone: the
 * reverse lookup uses the platform's own geocoder.
 */
export async function locateMe(): Promise<LocateResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    let label = `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;
    let country: string | undefined;
    if (Platform.OS !== 'web') {
      const places = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
      const p = places[0];
      if (p) {
        label = [p.city ?? p.subregion ?? p.region, p.country].filter(Boolean).join(', ');
        country = p.isoCountryCode ?? undefined;
      }
    }
    // No time zone: a position is wherever the phone is, so the phone's own clock applies.
    return { ok: true, location: { lat: pos.coords.latitude, lng: pos.coords.longitude, label, country } };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
