import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export interface PanelEntryInput {
  /** Epoch ms when this content takes over. */
  at: number;
  title: string;
  body: string;
  /** Epoch ms the system countdown runs to. */
  countdownTo: number;
}

interface PrayerPanelNative {
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): boolean;
  openBatterySettings(): boolean;
  setPanel(entries: PanelEntryInput[], channelName: string): void;
  clearPanel(): void;
}

/**
 * Android-only native helpers. Absent on iOS, on the web and in Expo Go, where
 * every call below degrades to a harmless no-op so the rest of the app works.
 */
const native = Platform.OS === 'android' ? requireOptionalNativeModule<PrayerPanelNative>('PrayerPanel') : null;

export const panelSupported = native !== null;

/** True on Android < 12 and wherever exact alarms are allowed; false when Android may delay alerts. */
export function canScheduleExactAlarms(): boolean {
  if (!native) return true;
  try {
    return native.canScheduleExactAlarms();
  } catch {
    return false;
  }
}

export function openExactAlarmSettings(): boolean {
  try {
    return native?.openExactAlarmSettings() ?? false;
  } catch {
    return false;
  }
}

export function openBatterySettings(): boolean {
  try {
    return native?.openBatterySettings() ?? false;
  } catch {
    return false;
  }
}

export function setPanel(entries: PanelEntryInput[], channelName: string): void {
  try {
    native?.setPanel(entries, channelName);
  } catch {
    // A failed panel must never break scheduling of the alerts themselves.
  }
}

export function clearPanel(): void {
  try {
    native?.clearPanel();
  } catch {
    // Nothing to clear.
  }
}
