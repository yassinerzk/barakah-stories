import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * In-app accessibility choices. Each one adds to what the phone already does —
 * none of them can make text smaller than the system setting or turn motion
 * back on when the system asks for less. This is ordinary UI code: the app does
 * not use Android's AccessibilityService API, which Play restricts to tools
 * built for people with disabilities.
 */
interface A11yState {
  /** OR'd with the system "remove animations" / "reduce motion" setting. */
  reduceMotion: boolean;
  boldArabic: boolean;
  /** Quran and hadith reading text 25% larger, on top of the system text size. */
  largeText: boolean;
  /** A short vibration when the phone points at the Qibla. */
  haptics: boolean;
  /** Spoken turn-left / turn-right guidance while a screen reader is on. */
  qiblaVoice: boolean;
  set: (patch: Partial<Omit<A11yState, 'set'>>) => void;
}

export const useA11yStore = create<A11yState>()(
  persist(
    (set) => ({
      reduceMotion: false,
      boldArabic: false,
      largeText: false,
      haptics: true,
      qiblaVoice: true,
      set: (patch) => set(patch),
    }),
    { name: 'barakah.a11y', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const LARGE_TEXT_SCALE = 1.25;

/** True while either the system or the in-app setting asks for less motion. */
export function useReducedMotion(): boolean {
  const override = useA11yStore((s) => s.reduceMotion);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => alive && setSystem(on))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return override || system;
}

/** Reads the current value once, for code that runs before React renders. */
export async function reducedMotionNow(): Promise<boolean> {
  if (useA11yStore.getState().reduceMotion) return true;
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}

export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => alive && setOn(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

/** Speaks a message through TalkBack / VoiceOver; silent when no screen reader is on. */
export function announce(message: string): void {
  if (Platform.OS === 'web' || !message) return;
  AccessibilityInfo.announceForAccessibility(message);
}
