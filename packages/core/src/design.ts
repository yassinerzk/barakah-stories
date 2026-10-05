import type { Locale, Post, StoryDesign } from './types';
import { getArabicFont, getLatinFont } from './fonts';
import { toLocaleDigits } from './hijri';
import { isRtl } from './i18n';
import { simplifyUthmani, type QuranChapterMeta, type QuranVerse } from './quran';
import { extractMatn, HADITH_BOOKS, stripNarrator, type HadithEntry } from './hadith';
import { QURAN_TRANSLATIONS } from './content/quranTranslations.generated';
import { HADITH_TRANSLATIONS } from './content/hadithTranslations.generated';

export const DEFAULT_DESIGN: StoryDesign = {
  kind: 'greeting',
  headline: '',
  arabic: '',
  translation: '',
  source: '',
  footer: '',
  showTranslation: true,
  showSource: true,
  showHijriDate: true,
  showFrame: false,
  hideWatermark: false,
  theme: 'emerald-night',
  background: 'none',
  decoration: 'crescent',
  arabicFont: 'amiri',
  latinFont: 'cormorant',
  fontScale: 1,
  align: 'center',
  video: null,
  sound: null,
  lengthSec: 15,
};

/**
 * The post's explanatory line in the reader's language.
 *
 * Two sources, in order. `post.translations` holds renderings the app wrote,
 * which is only ever greetings. `QURAN_TRANSLATIONS` holds established
 * editions, pulled in by scripts/gen-quran-translations.mjs, because a verse
 * may not be rendered by us. English is the last resort.
 *
 * Arabic intentionally resolves to English: the card already carries the
 * Arabic, so the line beneath it would only repeat the text.
 */
export function postTranslation(post: Post, locale: Locale): string {
  if (!post.translation) return '';
  return (
    post.translations?.[locale] ??
    QURAN_TRANSLATIONS[post.id]?.[locale] ??
    HADITH_TRANSLATIONS[post.id]?.[locale] ??
    post.translation
  );
}

/** Builds an editable design from a catalogue post. */
export function designFromPost(post: Post, locale: Locale): StoryDesign {
  return {
    ...DEFAULT_DESIGN,
    postId: post.id,
    kind: post.kind,
    headline: post.headline?.ar ?? '',
    arabic: post.arabic,
    translation: postTranslation(post, locale),
    source: post.source?.[locale] ?? post.source?.en ?? '',
    showTranslation: !!post.translation,
    showSource: !!post.source,
    theme: post.theme,
    background: post.background ?? 'none',
    decoration: post.decoration,
    arabicFont: post.font ?? (post.kind === 'quran' || post.kind === 'hadith' ? 'amiri' : 'aref-ruqaa'),
  };
}

/** A story pre-filled from one or more consecutive Quran verses. */
export function designFromVerses(
  chapter: QuranChapterMeta,
  verses: QuranVerse[],
  locale: Locale,
): StoryDesign {
  const from = verses[0]?.id ?? 1;
  const to = verses[verses.length - 1]?.id ?? from;
  const range = from === to ? `${from}` : `${from}-${to}`;
  const rangeAr =
    from === to ? toLocaleDigits(from, 'ar') : `${toLocaleDigits(from, 'ar')}-${toLocaleDigits(to, 'ar')}`;
  const source = {
    en: `Surah ${chapter.transliteration} ${chapter.id}:${range}`,
    ar: `سورة ${chapter.name} ${toLocaleDigits(chapter.id, 'ar')}:${rangeAr}`,
  };
  return {
    ...DEFAULT_DESIGN,
    kind: 'quran',
    arabic: verses.map((v) => simplifyUthmani(v.text)).join(' ۝ '),
    translation: verses.map((v) => v.translation.trim()).join(' '),
    source: isRtl(locale) ? source.ar : source.en,
    theme: 'ivory-gold',
    decoration: 'arch',
    arabicFont: 'amiri',
  };
}

/** A story pre-filled from a hadith. */
export function designFromHadith(entry: HadithEntry, locale: Locale): StoryDesign {
  const book = HADITH_BOOKS[entry.book];
  const source = {
    en: `${book.name} ${entry.number}`,
    ar: `${book.nameAr} ${toLocaleDigits(entry.number, 'ar')}`,
  };
  return {
    ...DEFAULT_DESIGN,
    kind: 'hadith',
    arabic: extractMatn(entry.ar),
    translation: stripNarrator(entry.en),
    source: isRtl(locale) ? source.ar : source.en,
    theme: 'emerald-night',
    decoration: 'none',
    arabicFont: 'naskh',
  };
}

export const FONT_SCALE_MIN = 0.7;
export const FONT_SCALE_MAX = 1.4;

function stepSize(length: number, steps: ReadonlyArray<[number, number]>, fallback: number): number {
  for (const [max, size] of steps) if (length <= max) return size;
  return fallback;
}

/** Computed pixel sizes for a 1080x1920 card, derived from text length. */
export interface CardTypography {
  arabicSize: number;
  arabicLineHeight: number;
  arabicFamily: string;
  arabicWeight: number;
  headlineSize: number;
  translationSize: number;
  translationFamily: string;
  translationItalic: boolean;
  sourceSize: number;
}

export function computeTypography(design: StoryDesign): CardTypography {
  const af = getArabicFont(design.arabicFont);
  const lf = getLatinFont(design.latinFont);
  const arabicLen = design.arabic.trim().length;
  const translationLen = design.showTranslation ? design.translation.trim().length : 0;
  // Long translations steal vertical space from the Arabic body; shrink both gently.
  const crowd = translationLen > 160 ? 0.9 : translationLen > 100 ? 0.95 : 1;

  const arabicBase = stepSize(
    arabicLen,
    [
      [24, 118],
      [48, 100],
      [80, 86],
      [120, 74],
      [170, 64],
      [230, 56],
    ],
    48,
  );
  const translationBase = stepSize(
    translationLen,
    [
      [50, 46],
      [110, 40],
      [180, 36],
      [260, 32],
    ],
    28,
  );
  const s = design.fontScale;
  return {
    arabicSize: Math.round(arabicBase * af.scale * s * crowd),
    arabicLineHeight: af.lineHeight,
    arabicFamily: af.family,
    arabicWeight: af.weight,
    headlineSize: Math.round(60 * Math.sqrt(s)),
    translationSize: Math.round(translationBase * lf.scale * Math.sqrt(s) * crowd),
    translationFamily: lf.family,
    translationItalic: lf.italic,
    sourceSize: Math.round(28 * Math.sqrt(s)),
  };
}

/** Plain-text version of a design, handy as a WhatsApp caption. */
export function designToText(design: StoryDesign): string {
  return [
    design.headline,
    design.arabic,
    design.showTranslation ? design.translation : '',
    design.showSource && design.source ? `— ${design.source}` : '',
    design.footer,
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n');
}
