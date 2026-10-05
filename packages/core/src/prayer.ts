import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes,
  Qibla,
  type CalculationParameters,
} from 'adhan';
import type { Locale, Localized } from './types';
import { localeMeta, tagOf } from './i18n';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_NAMES: ReadonlyArray<{ id: PrayerName; label: Localized; isPrayer: boolean }> = [
  {
    id: 'fajr',
    label: { en: 'Fajr', ar: 'الفجر', fr: 'Fajr', id: 'Subuh', ms: 'Subuh', th: 'ซุบฮิ', ur: 'فجر' },
    isPrayer: true,
  },
  {
    id: 'sunrise',
    label: {
      en: 'Sunrise',
      ar: 'الشروق',
      fr: 'Lever du soleil',
      id: 'Terbit',
      ms: 'Syuruk',
      th: 'ดวงอาทิตย์ขึ้น',
      ur: 'طلوعِ آفتاب',
    },
    isPrayer: false,
  },
  {
    id: 'dhuhr',
    label: { en: 'Dhuhr', ar: 'الظهر', fr: 'Dhuhr', id: 'Zuhur', ms: 'Zohor', th: 'ซุฮริ', ur: 'ظہر' },
    isPrayer: true,
  },
  {
    id: 'asr',
    label: { en: 'Asr', ar: 'العصر', fr: 'Asr', id: 'Asar', ms: 'Asar', th: 'อัศริ', ur: 'عصر' },
    isPrayer: true,
  },
  {
    id: 'maghrib',
    label: { en: 'Maghrib', ar: 'المغرب', fr: 'Maghrib', id: 'Magrib', ms: 'Maghrib', th: 'มัฆริบ', ur: 'مغرب' },
    isPrayer: true,
  },
  {
    id: 'isha',
    label: { en: 'Isha', ar: 'العشاء', fr: 'Isha', id: 'Isya', ms: 'Isyak', th: 'อิชาอ์', ur: 'عشاء' },
    isPrayer: true,
  },
];

export type CalcMethodId =
  | 'MuslimWorldLeague'
  | 'UmmAlQura'
  | 'Egyptian'
  | 'Karachi'
  | 'NorthAmerica'
  | 'Dubai'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Turkey'
  | 'Tehran'
  | 'MoonsightingCommittee';

export const CALC_METHODS: ReadonlyArray<{ id: CalcMethodId; label: Localized }> = [
  { id: 'MuslimWorldLeague', label: { en: 'Muslim World League', ar: 'رابطة العالم الإسلامي' } },
  { id: 'UmmAlQura', label: { en: 'Umm al-Qura (Makkah)', ar: 'أم القرى (مكة)' } },
  { id: 'Egyptian', label: { en: 'Egyptian General Authority', ar: 'الهيئة المصرية العامة للمساحة' } },
  { id: 'Karachi', label: { en: 'University of Karachi', ar: 'جامعة كراتشي' } },
  { id: 'NorthAmerica', label: { en: 'ISNA (North America)', ar: 'الجمعية الإسلامية لأمريكا الشمالية' } },
  { id: 'Dubai', label: { en: 'Dubai', ar: 'دبي' } },
  { id: 'Kuwait', label: { en: 'Kuwait', ar: 'الكويت' } },
  { id: 'Qatar', label: { en: 'Qatar', ar: 'قطر' } },
  { id: 'Singapore', label: { en: 'Singapore', ar: 'سنغافورة' } },
  { id: 'Turkey', label: { en: 'Turkey (Diyanet)', ar: 'تركيا (ديانت)' } },
  { id: 'Tehran', label: { en: 'Tehran', ar: 'طهران' } },
  { id: 'MoonsightingCommittee', label: { en: 'Moonsighting Committee', ar: 'لجنة رؤية الهلال' } },
];

export type MadhabId = 'shafi' | 'hanafi';

export interface PrayerSettings {
  method: CalcMethodId;
  madhab: MadhabId;
}

export interface PrayerTime {
  id: PrayerName;
  time: Date;
}

function paramsFor(settings: PrayerSettings): CalculationParameters {
  const p = CalculationMethod[settings.method]();
  p.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return p;
}

/**
 * Prayer times for the civil day containing `date` at the given point.
 *
 * Far north and south, twilight can last all night and above the polar circles
 * the sun may not rise or set at all, so Fajr and Isha have no astronomical
 * answer. The library then returns an invalid date. Two standard resolutions
 * keep every time real: above 48° the night is divided (a seventh of it, the
 * library's recommendation), and inside the polar circles the times of the
 * nearest day that has a sunrise and sunset are used. Below 48° neither changes
 * anything.
 */
export function computePrayerTimes(point: GeoPoint, date: Date, settings: PrayerSettings): PrayerTime[] {
  const coordinates = new Coordinates(point.lat, point.lng);
  const params = paramsFor(settings);
  params.highLatitudeRule = HighLatitudeRule.recommended(coordinates);
  params.polarCircleResolution = PolarCircleResolution.AqrabYaum;
  const pt = new PrayerTimes(coordinates, date, params);
  return PRAYER_NAMES.map(({ id }) => ({ id, time: pt[id] }));
}

/**
 * The next prayer (not sunrise) after `now`. Falls over to tomorrow's Fajr
 * once Isha has passed.
 */
export function nextPrayer(point: GeoPoint, now: Date, settings: PrayerSettings): PrayerTime {
  const today = computePrayerTimes(point, now, settings).filter((t) => t.id !== 'sunrise');
  const upcoming = today.find((t) => t.time.getTime() > now.getTime());
  if (upcoming) return upcoming;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fajr = computePrayerTimes(point, tomorrow, settings).find((t) => t.id === 'fajr')!;
  return fajr;
}

/** Bearing from `point` to the Kaaba in degrees clockwise from true north. */
export function qiblaBearing(point: GeoPoint): number {
  return Qibla(new Coordinates(point.lat, point.lng));
}

export function formatClock(date: Date, locale: Locale, timeZone?: string): string {
  // Arabic keeps its own 12-hour convention and Arabic-Indic digits; everywhere
  // else a 24-hour clock avoids an am/pm abbreviation in seven languages.
  const arabicDigits = localeMeta(locale).digits === 'arab';
  return new Intl.DateTimeFormat(tagOf(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: arabicDigits ? undefined : false,
    timeZone,
  }).format(date);
}

/** Splits a positive millisecond span into hours and minutes. */
export function splitCountdown(ms: number): { hours: number; minutes: number } {
  const total = Math.max(0, Math.round(ms / 60_000));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}
