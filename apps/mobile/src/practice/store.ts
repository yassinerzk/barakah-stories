import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DHIKR_PRESETS, tallyAdd, toggleDeed, type DeedId, type DeedLog, type Tally } from '@barakah/core';

/*
 * Tasbih and daily deeds live only on this phone (AsyncStorage). Nothing is
 * synced or sent anywhere; the history is plain day-keyed objects from core.
 */

export type TasbihTarget = 33 | 99 | 100;

interface TasbihState {
  tally: Tally;
  dhikrId: string;
  target: TasbihTarget;
  /** Count in the current round, 0..target. */
  count: number;
  /** Returns true when this tap completed the round. */
  tap: () => boolean;
  undo: () => void;
  reset: () => void;
  select: (id: string) => void;
  setTarget: (t: TasbihTarget) => void;
}

export const useTasbihStore = create<TasbihState>()(
  persist(
    (set, get) => ({
      tally: {},
      dhikrId: DHIKR_PRESETS[0].id,
      target: 33,
      count: 0,
      tap: () => {
        const { count, target, tally } = get();
        // A finished round stays on screen until the next tap starts a new one.
        const next = count >= target ? 1 : count + 1;
        set({ count: next, tally: tallyAdd(tally, new Date(), 1) });
        return next === target;
      },
      undo: () => {
        const { count, tally } = get();
        if (count === 0) return;
        set({ count: count - 1, tally: tallyAdd(tally, new Date(), -1) });
      },
      reset: () => set({ count: 0 }),
      select: (id) => {
        const preset = DHIKR_PRESETS.find((p) => p.id === id);
        set({ dhikrId: id, count: 0, target: preset?.target ?? get().target });
      },
      setTarget: (target) => set({ target, count: Math.min(get().count, target) }),
    }),
    { name: 'barakah.tasbih', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);

interface DeedsState {
  log: DeedLog;
  toggle: (id: DeedId) => void;
}

export const useDeedsStore = create<DeedsState>()(
  persist(
    (set, get) => ({
      log: {},
      toggle: (id) => set({ log: toggleDeed(get().log, new Date(), id) }),
    }),
    { name: 'barakah.deeds', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
