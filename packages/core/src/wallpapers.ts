import type { BackgroundId, ThemeId } from './types';

/**
 * Phone wallpapers made from the app's own artwork: one of the photos, or a
 * theme's gradient and pattern, with a dhikr, a short whole ayah or one of the
 * Names of Allah set low enough to leave the lock-screen clock clear.
 *
 * Words are referenced, not copied: the app reads the ayah from the bundled
 * Quran text and the dhikr and Names from their own lists, so a wallpaper can
 * never quote something slightly different from the rest of the app.
 */
export type WallpaperBase =
  | { kind: 'photo'; background: Exclude<BackgroundId, 'none'> }
  | { kind: 'theme'; theme: ThemeId };

export type WallpaperWords =
  | { kind: 'none' }
  | { kind: 'dhikr'; id: string }
  | { kind: 'ayah'; surah: number; ayah: number }
  | { kind: 'name'; n: number };

export interface Wallpaper {
  id: string;
  base: WallpaperBase;
  words: WallpaperWords;
}

const NONE: WallpaperWords = { kind: 'none' };
const dhikr = (id: string): WallpaperWords => ({ kind: 'dhikr', id });
const ayah = (surah: number, n: number): WallpaperWords => ({ kind: 'ayah', surah, ayah: n });
const name = (n: number): WallpaperWords => ({ kind: 'name', n });
const photo = (id: string, background: Exclude<BackgroundId, 'none'>, words: WallpaperWords): Wallpaper => ({
  id,
  base: { kind: 'photo', background },
  words,
});
const theme = (id: string, themeId: ThemeId, words: WallpaperWords): Wallpaper => ({
  id,
  base: { kind: 'theme', theme: themeId },
  words,
});

/** Gallery order: photos and patterns alternate so neither kind clumps together. */
export const WALLPAPERS: readonly Wallpaper[] = [
  photo('sunset-ease', 'mosque-sunset', ayah(94, 5)),
  theme('emerald-subhanallah', 'emerald-night', dhikr('subhanallah')),
  photo('stars-rahman', 'starry-night', name(1)),
  theme('midnight-ikhlas', 'midnight-blue', ayah(112, 1)),
  photo('sea-alhamdulillah', 'mosque-sea', dhikr('alhamdulillah')),
  theme('burgundy-tahlil', 'burgundy-gold', dhikr('tahlil')),
  photo('desert-blessings', 'desert-dusk', ayah(55, 13)),
  theme('lagoon-istighfar', 'teal-lagoon', dhikr('istighfar')),
  photo('forest-with-you', 'forest-light', ayah(20, 46)),
  theme('purple-salam', 'royal-purple', name(5)),
  photo('mountain-lake', 'mountain-lake', NONE),
  theme('charcoal-fatiha', 'charcoal-minimal', ayah(1, 5)),
  photo('courtyard-takbir', 'mosque-courtyard', dhikr('allahuakbar')),
  theme('ivory-remember', 'ivory-gold', ayah(2, 152)),
  photo('ocean-ease', 'ocean-sunrise', ayah(94, 6)),
  theme('sage-wadud', 'olive-sage', name(47)),
  photo('lavender-salawat', 'lavender-field', dhikr('salawat')),
  theme('dawn-latif', 'desert-dawn', name(30)),
  photo('cherry-blossom', 'cherry-blossom', NONE),
  theme('rose-nur', 'rose-gold', name(93)),
  photo('wildflowers', 'wildflowers', NONE),
];

const WALLPAPER_MAP = new Map(WALLPAPERS.map((w) => [w.id, w]));

export function getWallpaper(id: string): Wallpaper | null {
  return WALLPAPER_MAP.get(id) ?? null;
}

/** Vowel marks, Quranic annotation signs, tatweel and spaces: none of them widen a line. */
const NOT_LETTERS = /[ؐ-ًؚ-ٰٟۖ-ۭـ\s]/g;

export function arabicLetterCount(text: string): number {
  return text.replace(NOT_LETTERS, '').length;
}

/** Text size as a share of the wallpaper's width. */
const LARGEST = 0.13;
const SMALLEST = 0.07;
/** Phrases up to this many letters get the largest size... */
const SHORT_PHRASE = 12;
/** ...and each letter beyond it takes this much off. */
const STEP_PER_LETTER = 0.0025;

/**
 * Short dhikr are set large; longer ayahs step down so they wrap to a few
 * lines at most, never small enough to be hard to read on a lock screen.
 */
export function wallpaperTextSize(arabic: string): number {
  const extra = Math.max(0, arabicLetterCount(arabic) - SHORT_PHRASE);
  return Math.max(SMALLEST, LARGEST - extra * STEP_PER_LETTER);
}
