import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { DEFAULT_ALERT_PREFS, setPrayerMode, type AlertMode, type AlertPrayer, type PrayerAlertPrefs } from '@barakah/core';
import { usePrayerStore, useSettingsStore } from '../store';
import { hasReminderPermission, requestReminderPermission, type PermissionOutcome } from './service';
import { applyPrayerAlerts } from './prayerScheduler';
import { canScheduleExactAlarms } from '../../modules/prayer-panel';

interface PrayerAlertState {
  prefs: PrayerAlertPrefs;
  /** Whether Android will deliver alerts on the minute. Not persisted: the user can change it in settings. */
  exactAllowed: boolean;
  enable: () => Promise<PermissionOutcome>;
  disable: () => void;
  setMode: (prayer: AlertPrayer, mode: AlertMode) => void;
  setPanel: (on: boolean) => void;
  refreshExact: () => void;
}

export const usePrayerAlertStore = create<PrayerAlertState>()(
  persist(
    (set, get) => ({
      prefs: DEFAULT_ALERT_PREFS,
      exactAllowed: true,
      enable: async () => {
        const outcome = await requestReminderPermission();
        if (outcome !== 'granted') return outcome;
        set({ prefs: { ...get().prefs, enabled: true }, exactAllowed: canScheduleExactAlarms() });
        await replanNow();
        return outcome;
      },
      disable: () => {
        set({ prefs: { ...get().prefs, enabled: false } });
        void replanNow();
      },
      setMode: (prayer, mode) => {
        set({ prefs: setPrayerMode(get().prefs, prayer, mode) });
        scheduleReplan();
      },
      setPanel: (on) => {
        set({ prefs: { ...get().prefs, panel: on } });
        scheduleReplan();
      },
      refreshExact: () => set({ exactAllowed: canScheduleExactAlarms() }),
    }),
    {
      name: 'barakah.prayerAlerts',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ prefs: s.prefs }),
      merge: (persisted, current) => {
        const p = (persisted as { prefs?: Partial<PrayerAlertPrefs> } | undefined)?.prefs;
        return { ...current, prefs: { ...DEFAULT_ALERT_PREFS, ...p, modes: { ...DEFAULT_ALERT_PREFS.modes, ...p?.modes } } };
      },
    },
  ),
);

let queue: Promise<unknown> = Promise.resolve();

/**
 * Re-plans from the current state of every store. Launch, resume, settings
 * changes and the background task can all ask at once, and each run is a
 * cancel-then-schedule pair — two of those interleaving could wipe the other's
 * alerts. So every run waits its turn in one queue, and reads the stores only
 * when it starts, so the last one always reflects the latest state.
 */
export function replanNow(): Promise<number> {
  const run = queue.then(async () => {
    const { location, method, madhab } = usePrayerStore.getState();
    const locale = useSettingsStore.getState().locale;
    const prefs = usePrayerAlertStore.getState().prefs;
    await registerBackgroundReplan(prefs.enabled && location !== null);
    return applyPrayerAlerts({ location, settings: { method, madhab }, prefs, locale });
  });
  queue = run.catch(() => undefined);
  return run;
}

let pending: ReturnType<typeof setTimeout> | null = null;
/** Coalesces bursts of changes (tapping through modes) into one re-plan. */
function scheduleReplan(delayMs = 500): void {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    void replanNow();
  }, delayMs);
}

/* ------------------------------------------------------------------------ */
/* Keeping the schedule topped up                                            */
/* ------------------------------------------------------------------------ */

/**
 * Twelve days are scheduled at a time. The app tops the window up on every
 * launch and return to the foreground; this background task does it about
 * twice a day for people who rarely open the app, so alerts never run dry.
 */
export const REPLAN_TASK = 'barakah.prayer-replan';
const REPLAN_INTERVAL_MINUTES = 12 * 60;

TaskManager.defineTask(REPLAN_TASK, async () => {
  try {
    await Promise.all([
      usePrayerAlertStore.persist.rehydrate(),
      usePrayerStore.persist.rehydrate(),
      useSettingsStore.persist.rehydrate(),
    ]);
    await replanNow();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

async function registerBackgroundReplan(on: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(REPLAN_TASK);
    if (on && !registered) {
      await BackgroundTask.registerTaskAsync(REPLAN_TASK, { minimumInterval: REPLAN_INTERVAL_MINUTES });
    } else if (!on && registered) {
      await BackgroundTask.unregisterTaskAsync(REPLAN_TASK);
    }
  } catch {
    // Background work unavailable (e.g. Expo Go): launch-time re-planning still covers it.
  }
}

/**
 * Wires re-planning to everything that changes the answer: the location,
 * the calculation method, the language the alerts are written in, and coming
 * back to the app (a day has passed, or the exact-alarm grant was changed in
 * settings). Also repairs the state if notifications were revoked outside the app.
 */
export function startPrayerAlerts(): () => void {
  const repair = async () => {
    usePrayerAlertStore.getState().refreshExact();
    const { prefs } = usePrayerAlertStore.getState();
    if (prefs.enabled && !(await hasReminderPermission())) {
      usePrayerAlertStore.setState({ prefs: { ...prefs, enabled: false } });
    }
    await replanNow();
  };
  void repair();

  const unsubPrayer = usePrayerStore.subscribe((s, prev) => {
    if (s.location !== prev.location || s.method !== prev.method || s.madhab !== prev.madhab) scheduleReplan();
  });
  const unsubLocale = useSettingsStore.subscribe((s, prev) => {
    if (s.locale !== prev.locale) scheduleReplan();
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void repair();
  });
  return () => {
    unsubPrayer();
    unsubLocale();
    appState.remove();
  };
}
