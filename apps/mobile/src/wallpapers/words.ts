import { DHIKR_PRESETS, DIVINE_NAMES, getChapterMeta, toLocaleDigits, type Locale, type WallpaperWords } from '@barakah/core';
import { loadChapter } from '../quran/chapters';

export interface WallpaperText {
  arabic: string;
  /** The short line under the Arabic: an ayah's reference, or how to say a dhikr or Name. */
  caption: string | null;
}

/** People reading Arabic script don't need a transliteration of what they can read. */
const readsArabicScript = (locale: Locale) => locale === 'ar' || locale === 'ur';

/** Resolves a wallpaper's words from the app's own Quran text, dhikr list and Names. */
export function wallpaperText(words: WallpaperWords, locale: Locale): WallpaperText | null {
  switch (words.kind) {
    case 'none':
      return null;
    case 'dhikr': {
      const preset = DHIKR_PRESETS.find((p) => p.id === words.id);
      return preset ? { arabic: preset.arabic, caption: readsArabicScript(locale) ? null : preset.transliteration } : null;
    }
    case 'name': {
      const name = DIVINE_NAMES.find((d) => d.n === words.n);
      return name ? { arabic: name.arabic, caption: readsArabicScript(locale) ? null : name.transliteration } : null;
    }
    case 'ayah': {
      const meta = getChapterMeta(words.surah);
      const verse = loadChapter(words.surah)?.verses.find((v) => v.id === words.ayah);
      if (!meta || !verse) return null;
      const ref = `${toLocaleDigits(words.surah, locale)}:${toLocaleDigits(words.ayah, locale)}`;
      return { arabic: verse.text, caption: `${readsArabicScript(locale) ? meta.name : meta.transliteration} · ${ref}` };
    }
  }
}
