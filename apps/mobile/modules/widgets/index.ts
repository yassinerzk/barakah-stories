import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export interface WidgetPrayer {
  id: string;
  /** Localised name, e.g. "Maghrib". */
  name: string;
  /** Formatted clock time, e.g. "19:06". */
  time: string;
  /** Epoch ms. */
  at: number;
}

export interface WidgetDhikr {
  arabic: string;
  label: string;
  count: number;
  target: number;
}

interface BarakahWidgetsNative {
  setPrayers(place: string, nextLabel: string, prayers: WidgetPrayer[]): void;
  setDhikr(dhikr: WidgetDhikr): void;
  takeTaps(): number;
  canPin(): boolean;
  requestPin(kind: 'prayer' | 'dhikr'): boolean;
}

/**
 * Home-screen widgets on Android (iOS widgets live in a separate WidgetKit
 * target). Missing in Expo Go and on the web, where every call is a no-op.
 */
const native = Platform.OS === 'android' ? requireOptionalNativeModule<BarakahWidgetsNative>('BarakahWidgets') : null;

export const widgetsSupported = native !== null;

export function setWidgetPrayers(place: string, nextLabel: string, prayers: WidgetPrayer[]): void {
  try {
    native?.setPrayers(place, nextLabel, prayers);
  } catch {
    // A widget that misses an update is never worth breaking the app for.
  }
}

export function setWidgetDhikr(dhikr: WidgetDhikr): void {
  try {
    native?.setDhikr(dhikr);
  } catch {
    // Same as above.
  }
}

/** Taps made on the dhikr widget since last asked; 0 where there is no widget. */
export function takeWidgetTaps(): number {
  try {
    return native?.takeTaps() ?? 0;
  } catch {
    return 0;
  }
}

export function canPinWidget(): boolean {
  try {
    return native?.canPin() ?? false;
  } catch {
    return false;
  }
}

export function pinWidget(kind: 'prayer' | 'dhikr'): boolean {
  try {
    return native?.requestPin(kind) ?? false;
  } catch {
    return false;
  }
}
