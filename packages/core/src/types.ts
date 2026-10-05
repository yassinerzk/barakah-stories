/**
 * Core domain types. Every registry (categories, posts, themes, decorations,
 * fonts) is typed against this file so that adding new content is a
 * compile-time-checked operation.
 */

export type Locale = 'en' | 'ar' | 'fr' | 'id' | 'ms' | 'th' | 'ur';

/**
 * A string in as many locales as have been written so far.
 *
 * Only English is required. `pick()` falls back to it, which is what lets a new
 * locale be added without translating all ~450 registry labels in the same
 * change — the UI dictionaries stay strict, so those cannot be half-finished,
 * but theme and city names can arrive over time.
 */
export type Localized = { en: string } & Partial<Record<Locale, string>>;

/** What kind of text a post carries. Drives the small label on the card. */
export type PostKind = 'quran' | 'hadith' | 'dua' | 'dhikr' | 'greeting';

export type CategoryId =
  | 'friday'
  | 'morning'
  | 'evening'
  | 'ramadan'
  | 'laylat-al-qadr'
  | 'eid-al-fitr'
  | 'dhul-hijjah'
  | 'eid-al-adha'
  | 'muharram'
  | 'isra-miraj'
  | 'quran'
  | 'hadith'
  | 'dua'
  | 'occasions';

export type ThemeId =
  | 'emerald-night'
  | 'midnight-blue'
  | 'royal-purple'
  | 'desert-dawn'
  | 'rose-gold'
  | 'ivory-gold'
  | 'teal-lagoon'
  | 'burgundy-gold'
  | 'charcoal-minimal'
  | 'olive-sage';

export type PatternId = 'star8' | 'zellige' | 'lattice' | 'dots' | 'none';

export type BackgroundId =
  | 'none'
  | 'wildflowers'
  | 'river-valley'
  | 'mosque-sunset'
  | 'mountain-lake'
  | 'forest-light'
  | 'desert-dusk'
  | 'starry-night'
  | 'mosque-courtyard'
  | 'ocean-sunrise'
  | 'cherry-blossom'
  | 'lavender-field'
  | 'mosque-sea';

export type DecorationId =
  'none' | 'crescent' | 'lanterns' | 'mosque' | 'kaaba' | 'arch' | 'lights' | 'sunrise' | 'stars';

export type ArabicFontId =
  'amiri' | 'scheherazade' | 'naskh' | 'cairo' | 'tajawal' | 'reem-kufi' | 'aref-ruqaa';

export type LatinFontId = 'cormorant' | 'inter';

export type TextAlign = 'center' | 'start';

export interface Category {
  id: CategoryId;
  label: Localized;
  description: Localized;
  /** Emoji used as a lightweight icon in chips. */
  icon: string;
  /** Sort order in the gallery. */
  order: number;
}

export interface Post {
  id: string;
  category: CategoryId;
  kind: PostKind;
  /** Arabic body text. The primary text on the card. */
  arabic: string;
  /** English rendering: a translation, or the greeting in English. */
  translation?: string;
  /**
   * The same rendering in other locales. English stays in `translation`, and
   * any locale missing here falls back to it — which is deliberate for Arabic,
   * where the card's own Arabic is the text and a translation line would only
   * repeat it.
   *
   * For anything transmitted — Quran, hadith, duaa, dhikr — these must come
   * from an established, attributable translation. See docs/LOCALIZATION.md.
   */
  translations?: Partial<Record<Locale, string>>;
  /** Reference shown in small print, e.g. "Surah Al-Jumu'ah 62:9". */
  source?: Localized;
  /** Optional short headline above the body, e.g. "جمعة مباركة". */
  headline?: Localized;
  /** Suggested visual defaults. The user can override every one of them. */
  theme: ThemeId;
  decoration: DecorationId;
  /** Optional photo background; when set it replaces the theme's gradient. */
  background?: BackgroundId;
  font?: ArabicFontId;
  tags?: string[];
}

export type GradientStop = [offset: number, color: string];

/** Renderer-neutral gradient; web turns it into CSS, mobile into SVG. */
export type ThemeGradient =
  | { kind: 'linear'; angle: number; stops: GradientStop[] }
  | { kind: 'radial'; cx: number; cy: number; rx: number; ry: number; stops: GradientStop[] };

export interface Theme {
  id: ThemeId;
  name: Localized;
  mode: 'dark' | 'light';
  /** Card background gradient. */
  gradient: ThemeGradient;
  pattern: PatternId;
  patternColor: string;
  patternOpacity: number;
  /** Primary text color. */
  text: string;
  /** Secondary text color (translation, source). */
  muted: string;
  /** Accent color for ornaments, dividers and the headline. */
  accent: string;
  /** Color used by decorations (silhouettes, lanterns). */
  decor: string;
}

/** A photographic background rendered under a legibility scrim. */
export type ScrimKind = 'soft' | 'center';

export interface Background {
  id: Exclude<BackgroundId, 'none'>;
  name: Localized;
  /** Which darkening overlay keeps text readable over this photo. */
  scrim: ScrimKind;
}

export interface ArabicFont {
  id: ArabicFontId;
  name: Localized;
  family: string;
  /** Multiplier applied to the computed size so fonts look optically equal. */
  scale: number;
  lineHeight: number;
  weight: number;
  /** True for calligraphic faces best suited to Quran and hadith. */
  classical: boolean;
}

export interface LatinFont {
  id: LatinFontId;
  name: Localized;
  family: string;
  italic: boolean;
  scale: number;
}

/**
 * Everything needed to render one story card. This is the unit that gets
 * edited, saved, and exported. It is deliberately flat and serialisable.
 */
export interface StoryDesign {
  /** The post this design was started from, if any. */
  postId?: string;
  kind: PostKind;
  headline: string;
  arabic: string;
  translation: string;
  source: string;
  /** Free text at the bottom, typically the user's name or a wish. */
  footer: string;
  showTranslation: boolean;
  showSource: boolean;
  showHijriDate: boolean;
  showFrame: boolean;
  /** User asked to drop the app name; honoured only with an entitlement. */
  hideWatermark: boolean;
  theme: ThemeId;
  /** Photo background; 'none' uses the theme gradient. */
  background: BackgroundId;
  decoration: DecorationId;
  arabicFont: ArabicFontId;
  latinFont: LatinFontId;
  /** 0.7 – 1.4 multiplier on top of the automatic size. */
  fontScale: number;
  align: TextAlign;
  /** Video background id from the media manifest; null for a still story. */
  video: string | null;
  /** Ambient sound id from the media manifest; null for silence. */
  sound: string | null;
  /** Length of an exported video story, in seconds (10, 15 or 30). */
  lengthSec: number;
}

export interface SavedDesign {
  id: string;
  design: StoryDesign;
  createdAt: number;
  updatedAt: number;
}
