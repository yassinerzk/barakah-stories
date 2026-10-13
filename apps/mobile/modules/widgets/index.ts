import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { ExtensionStorage as ExtensionStorageClass } from '@bacons/apple-targets';

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

export type WallpaperTarget = 'home' | 'lock' | 'both';

interface BarakahWidgetsNative {
  setPrayers(place: string, nextLabel: string, prayers: WidgetPrayer[]): void;
  setDhikr(dhikr: WidgetDhikr): void;
  takeTaps(): number;
  canPin(): boolean;
  requestPin(kind: 'prayer' | 'dhikr'): boolean;
  /** Android only (iOS has no API for it), and missing from builds made before the Wallpapers screen. */
  canSetWallpaper?(): boolean;
  setWallpaper?(uri: string, target: WallpaperTarget): Promise<boolean>;
}

const APP_GROUP = 'group.com.barakah.stories';

/**
 * iOS: the WidgetKit extension (apps/mobile/targets/widget) reads the same data
 * from the App Group. Needs a native iOS build; in Expo Go the storage module is
 * absent, so this stays null and every call is a no-op.
 */
function iosBridge(): BarakahWidgetsNative | null {
  if (Platform.OS !== 'ios' || !requireOptionalNativeModule('ExtensionStorage')) return null;
  // Loaded only here, on a native iOS build: in Expo Go the package is never evaluated.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ExtensionStorage } = require('@bacons/apple-targets') as { ExtensionStorage: typeof ExtensionStorageClass };
  const store = new ExtensionStorage(APP_GROUP);
  return {
    setPrayers: (place, nextLabel, prayers) => {
      store.set('prayers', JSON.stringify(prayers));
      store.set('place', place);
      store.set('nextLabel', nextLabel);
      ExtensionStorage.reloadWidget();
    },
    setDhikr: (dhikr) => {
      store.set('dhikr', JSON.stringify(dhikr));
      ExtensionStorage.reloadWidget();
    },
    takeTaps: () => {
      const n = Number(store.get('pendingTaps') ?? 0) || 0;
      store.set('pendingTaps', '0');
      return n;
    },
    // iOS has no API for an app to add a widget; the gallery shows how instead.
    canPin: () => false,
    requestPin: () => false,
  };
}

/** Home-screen widgets: a local Kotlin module on Android, WidgetKit on iOS. Missing in Expo Go and on the web. */
const native: BarakahWidgetsNative | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<BarakahWidgetsNative>('BarakahWidgets') : iosBridge();

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

/** True where the app can set the wallpaper itself (Android); elsewhere the picture is saved instead. */
export function canSetWallpaper(): boolean {
  try {
    return native?.canSetWallpaper?.() ?? false;
  } catch {
    return false;
  }
}

/** Resolves false when the phone refuses it; the screen then says so. */
export async function setWallpaper(uri: string, target: WallpaperTarget): Promise<boolean> {
  if (!native?.setWallpaper) return false;
  try {
    return await native.setWallpaper(uri, target);
  } catch {
    return false;
  }
}
