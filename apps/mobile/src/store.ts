import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_DESIGN,
  pushRecent,
  type CalcMethodId,
  type GeoPoint,
  type Locale,
  type MadhabId,
  type SavedDesign,
  type StoryDesign,
} from '@barakah/core';

import { announce } from './a11y';

const storage = () => createJSONStorage(() => AsyncStorage);

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const migrateDesign = (d: Partial<StoryDesign> | undefined): StoryDesign => ({ ...DEFAULT_DESIGN, ...d });

/* ---------------- settings ---------------- */
interface SettingsState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}
export const useSettingsStore = create<SettingsState>()(
  persist((set) => ({ locale: 'en', setLocale: (locale) => set({ locale }) }), {
    name: 'barakah.settings',
    version: 1,
    storage: storage(),
  }),
);

/* ---------------- editor ---------------- */
interface EditorState {
  design: StoryDesign;
  original: StoryDesign;
  savedId?: string;
  load: (design: StoryDesign, savedId?: string) => void;
  patch: (partial: Partial<StoryDesign>) => void;
  reset: () => void;
  setSavedId: (id: string) => void;
}
export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      design: DEFAULT_DESIGN,
      original: DEFAULT_DESIGN,
      savedId: undefined,
      load: (design, savedId) => set({ design, original: design, savedId }),
      patch: (partial) => set({ design: { ...get().design, ...partial } }),
      reset: () => set({ design: get().original }),
      setSavedId: (savedId) => set({ savedId }),
    }),
    {
      name: 'barakah.editor',
      version: 2, // 2: video, sound and lengthSec — migrateDesign fills the defaults
      storage: storage(),
      migrate: (state) => {
        const s = state as Partial<EditorState>;
        return { ...s, design: migrateDesign(s.design), original: migrateDesign(s.original) };
      },
    },
  ),
);

/* ---------------- library ---------------- */
interface LibraryState {
  items: SavedDesign[];
  upsert: (design: StoryDesign, id?: string) => SavedDesign;
  remove: (id: string) => void;
}
export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      items: [],
      upsert: (design, id) => {
        const now = Date.now();
        const existing = id ? get().items.find((i) => i.id === id) : undefined;
        const saved: SavedDesign = existing
          ? { ...existing, design, updatedAt: now }
          : { id: newId('post'), design, createdAt: now, updatedAt: now };
        set({ items: [saved, ...get().items.filter((i) => i.id !== saved.id)] });
        return saved;
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
    }),
    { name: 'barakah.library', version: 1, storage: storage() },
  ),
);

/* ---------------- recent posts ---------------- */
interface RecentState {
  ids: string[];
  touch: (id: string) => void;
}
export const useRecentStore = create<RecentState>()(
  persist((set, get) => ({ ids: [], touch: (id) => set({ ids: pushRecent(get().ids, id) }) }), {
    name: 'barakah.recent',
    version: 1,
    storage: storage(),
  }),
);

/* ---------------- prayer ---------------- */
export interface PrayerLocation extends GeoPoint {
  label: string;
  /** IANA zone when the location is a preset city; undefined = device zone. */
  timeZone?: string;
}
interface PrayerState {
  location: PrayerLocation | null;
  method: CalcMethodId;
  madhab: MadhabId;
  setLocation: (location: PrayerLocation | null) => void;
  setMethod: (method: CalcMethodId) => void;
  setMadhab: (madhab: MadhabId) => void;
}
export const usePrayerStore = create<PrayerState>()(
  persist(
    (set) => ({
      location: null,
      method: 'MuslimWorldLeague',
      madhab: 'shafi',
      setLocation: (location) => set({ location }),
      setMethod: (method) => set({ method }),
      setMadhab: (madhab) => set({ madhab }),
    }),
    { name: 'barakah.prayer', version: 1, storage: storage() },
  ),
);

/* ---------------- toasts ---------------- */
export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}
interface ToastState {
  toasts: Toast[];
  show: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: string) => void;
}
export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (message, tone = 'info') => {
    const id = newId('t');
    set({ toasts: [...get().toasts, { id, message, tone }] });
    // iOS has no live regions; this also covers Android when focus is elsewhere.
    announce(message);
    setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/* ---------------- quran progress ---------------- */
import { addFinished, removeFinished, type QuranPosition, type QuranProgress } from '@barakah/core';

interface QuranState extends QuranProgress {
  showTranslation: boolean;
  fontScale: number;
  setLastRead: (pos: QuranPosition) => void;
  markFinished: (surah: number) => void;
  unmarkFinished: (surah: number) => void;
  setShowTranslation: (v: boolean) => void;
  setFontScale: (v: number) => void;
  /** Replaces progress from the cloud when it is newer. */
  applyRemote: (progress: QuranProgress) => void;
}
export const useQuranStore = create<QuranState>()(
  persist(
    (set, get) => ({
      lastRead: null,
      finished: [],
      updatedAt: 0,
      showTranslation: true,
      fontScale: 1,
      setLastRead: (lastRead) => set({ lastRead, updatedAt: Date.now() }),
      markFinished: (surah) => set({ finished: addFinished(get().finished, surah), updatedAt: Date.now() }),
      unmarkFinished: (surah) =>
        set({ finished: removeFinished(get().finished, surah), updatedAt: Date.now() }),
      setShowTranslation: (showTranslation) => set({ showTranslation }),
      setFontScale: (fontScale) => set({ fontScale }),
      applyRemote: (p) => {
        if (p.updatedAt > get().updatedAt)
          set({ lastRead: p.lastRead, finished: p.finished, updatedAt: p.updatedAt });
      },
    }),
    { name: 'barakah.quran', version: 1, storage: storage() },
  ),
);

/* ---------------- hadith ---------------- */
import type { HadithBookId } from '@barakah/core';

interface HadithState {
  downloaded: Partial<Record<HadithBookId, boolean>>;
  lastRead: Partial<Record<HadithBookId, { section: number; number: number }>>;
  setDownloaded: (book: HadithBookId, value: boolean) => void;
  setLastRead: (book: HadithBookId, section: number, number: number) => void;
}
export const useHadithStore = create<HadithState>()(
  persist(
    (set, get) => ({
      downloaded: {},
      lastRead: {},
      setDownloaded: (book, value) => set({ downloaded: { ...get().downloaded, [book]: value } }),
      setLastRead: (book, section, number) =>
        set({ lastRead: { ...get().lastRead, [book]: { section, number } } }),
    }),
    { name: 'barakah.hadith', version: 1, storage: storage() },
  ),
);
