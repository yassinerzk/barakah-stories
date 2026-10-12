import type { Localized } from './types';
import { toHijri } from './hijri';

/*
 * Daily practice: the tasbih tally, the daily-deeds checklist and the Hijri
 * calendar. Everything here is pure and keyed by the local calendar day, so the
 * app stores plain objects on the phone and nothing ever leaves it.
 */

/** The local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Same time of day, `n` calendar days away (safe across DST changes). */
export function addDays(date: Date, n: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + n);
  return out;
}

/* ------------------------------ tasbih ------------------------------ */

export interface DhikrPreset {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: Localized;
  /** The usual number to say it. */
  target: 33 | 99 | 100;
}

export const DHIKR_PRESETS: readonly DhikrPreset[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ ٱللَّٰهِ',
    transliteration: 'SubḥānAllāh',
    meaning: { en: 'Glory be to Allah', ar: 'سبحان الله', fr: 'Gloire à Allah', id: 'Mahasuci Allah', ms: 'Maha Suci Allah', th: 'มหาบริสุทธิ์แด่อัลลอฮ์', ur: 'اللہ پاک ہے' },
    target: 33,
  },
  {
    id: 'alhamdulillah',
    arabic: 'ٱلْحَمْدُ لِلَّٰهِ',
    transliteration: 'Alḥamdulillāh',
    meaning: { en: 'All praise is for Allah', ar: 'الحمد لله', fr: 'Louange à Allah', id: 'Segala puji bagi Allah', ms: 'Segala puji bagi Allah', th: 'การสรรเสริญทั้งมวลเป็นของอัลลอฮ์', ur: 'تمام تعریفیں اللہ کے لیے ہیں' },
    target: 33,
  },
  {
    id: 'allahuakbar',
    arabic: 'ٱللَّٰهُ أَكْبَرُ',
    transliteration: 'Allāhu Akbar',
    meaning: { en: 'Allah is the Greatest', ar: 'الله أكبر', fr: 'Allah est le plus Grand', id: 'Allah Mahabesar', ms: 'Allah Maha Besar', th: 'อัลลอฮ์ทรงยิ่งใหญ่', ur: 'اللہ سب سے بڑا ہے' },
    target: 33,
  },
  {
    id: 'tahlil',
    arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ',
    transliteration: 'Lā ilāha illā Allāh',
    meaning: { en: 'There is no god but Allah', ar: 'لا إله إلا الله', fr: "Il n'y a de dieu qu'Allah", id: 'Tiada tuhan selain Allah', ms: 'Tiada tuhan melainkan Allah', th: 'ไม่มีพระเจ้าอื่นใดนอกจากอัลลอฮ์', ur: 'اللہ کے سوا کوئی معبود نہیں' },
    target: 100,
  },
  {
    id: 'istighfar',
    arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ',
    transliteration: 'Astaghfirullāh',
    meaning: { en: 'I seek the forgiveness of Allah', ar: 'أستغفر الله', fr: 'Je demande pardon à Allah', id: 'Aku memohon ampun kepada Allah', ms: 'Aku memohon ampun kepada Allah', th: 'ข้าพเจ้าขออภัยโทษจากอัลลอฮ์', ur: 'میں اللہ سے معافی مانگتا ہوں' },
    target: 100,
  },
  {
    id: 'salawat',
    arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
    transliteration: 'Allāhumma ṣalli ʿalā Muḥammad',
    meaning: { en: 'O Allah, send blessings upon Muhammad', ar: 'اللهم صل على محمد', fr: 'Ô Allah, prie sur Muhammad', id: 'Ya Allah, limpahkan shalawat kepada Muhammad', ms: 'Ya Allah, limpahkan selawat ke atas Muhammad', th: 'โอ้อัลลอฮ์ โปรดประทานความเมตตาแด่มุฮัมมัด', ur: 'اے اللہ، محمد پر درود بھیج' },
    target: 100,
  },
];

/** Count per day: { 'YYYY-MM-DD': n }. */
export type Tally = Readonly<Record<string, number>>;

export function tallyAdd(tally: Tally, day: Date, n: number): Tally {
  const k = dayKey(day);
  return { ...tally, [k]: Math.max(0, (tally[k] ?? 0) + n) };
}

export function tallyStats(tally: Tally, today: Date): { today: number; yesterday: number; allTime: number } {
  return {
    today: tally[dayKey(today)] ?? 0,
    yesterday: tally[dayKey(addDays(today, -1))] ?? 0,
    allTime: Object.values(tally).reduce((a, b) => a + b, 0),
  };
}

/* ------------------------------ daily deeds ------------------------------ */

export type DeedId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'quran' | 'morning' | 'evening' | 'salawat';
export const PRAYER_DEEDS: readonly DeedId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const DEEDS: readonly DeedId[] = [...PRAYER_DEEDS, 'quran', 'morning', 'evening', 'salawat'];

/** Deeds ticked per day: { 'YYYY-MM-DD': ['fajr', 'quran', …] }. */
export type DeedLog = Readonly<Record<string, readonly DeedId[]>>;

export function toggleDeed(log: DeedLog, day: Date, id: DeedId): DeedLog {
  const k = dayKey(day);
  const list = log[k] ?? [];
  return { ...log, [k]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
}

/** A day keeps the streak alive when all five prayers were ticked. */
const dayComplete = (log: DeedLog, k: string) => PRAYER_DEEDS.every((p) => log[k]?.includes(p));

export interface DeedStats {
  streak: number;
  best: number;
  doneToday: number;
  total: number;
  week: { key: string; date: Date; done: number; complete: boolean }[];
}

export function deedStats(log: DeedLog, today: Date): DeedStats {
  // An unfinished today does not break the streak; it just has not joined it yet.
  let cursor = dayComplete(log, dayKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (dayComplete(log, dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const complete = Object.keys(log)
    .filter((k) => dayComplete(log, k))
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of complete) {
    run = prev !== null && dayKey(addDays(new Date(`${prev}T12:00:00`), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const key = dayKey(date);
    return { key, date, done: log[key]?.length ?? 0, complete: dayComplete(log, key) };
  });

  return { streak, best: Math.max(best, streak), doneToday: log[dayKey(today)]?.length ?? 0, total: DEEDS.length, week };
}

/* ------------------------------ hijri calendar ------------------------------ */

export interface HijriMonthDay {
  date: Date;
  hijriDay: number;
}

export interface HijriMonth {
  year: number;
  month: number;
  days: HijriMonthDay[];
}

/** First day of the Hijri month containing `date`. */
function monthStart(date: Date): Date {
  const h = toHijri(date);
  return h ? addDays(date, 1 - h.day) : date;
}

/**
 * The Hijri month `offset` months from the one containing `anchor`, as its
 * days with their Gregorian dates (Umm al-Qura, like the rest of the app).
 */
export function hijriMonth(anchor: Date, offset: number): HijriMonth {
  let start = monthStart(anchor);
  for (let i = 0; i < Math.abs(offset); i++) start = monthStart(addDays(start, offset > 0 ? 32 : -2));
  const first = toHijri(start);
  const days: HijriMonthDay[] = [];
  for (let i = 0; i < 31; i++) {
    const date = addDays(start, i);
    const h = toHijri(date);
    if (!h || !first || h.month !== first.month) break;
    days.push({ date, hijriDay: h.day });
  }
  return { year: first?.year ?? 0, month: first?.month ?? 0, days };
}

export interface IslamicEvent {
  id: string;
  name: Localized;
  hijriMonth: number;
  hijriDay: number;
}

export const ISLAMIC_EVENTS: readonly IslamicEvent[] = [
  { id: 'new-year', hijriMonth: 1, hijriDay: 1, name: { en: 'Islamic New Year', ar: 'رأس السنة الهجرية', fr: "Nouvel An de l'Hégire", id: 'Tahun Baru Hijriah', ms: 'Maal Hijrah', th: 'ปีใหม่อิสลาม', ur: 'اسلامی نیا سال' } },
  { id: 'ashura', hijriMonth: 1, hijriDay: 10, name: { en: 'Ashura', ar: 'عاشوراء', fr: 'Achoura', id: 'Asyura', ms: 'Asyura', th: 'วันอาชูรอ', ur: 'عاشورہ' } },
  { id: 'mawlid', hijriMonth: 3, hijriDay: 12, name: { en: 'Mawlid an-Nabi', ar: 'المولد النبوي', fr: 'Mawlid', id: 'Maulid Nabi', ms: 'Maulidur Rasul', th: 'เมาลิดนบี', ur: 'میلاد النبی' } },
  { id: 'isra-miraj', hijriMonth: 7, hijriDay: 27, name: { en: "Isra' and Mi'raj", ar: 'الإسراء والمعراج', fr: "Isra et Mi'raj", id: "Isra Mi'raj", ms: 'Israk dan Mikraj', th: 'อิสรออ์และเมียะอ์รอจ', ur: 'اسراء و معراج' } },
  { id: 'ramadan', hijriMonth: 9, hijriDay: 1, name: { en: 'Ramadan begins', ar: 'بداية رمضان', fr: 'Début du Ramadan', id: 'Awal Ramadan', ms: 'Awal Ramadan', th: 'เริ่มเดือนรอมฎอน', ur: 'رمضان کا آغاز' } },
  { id: 'laylat-al-qadr', hijriMonth: 9, hijriDay: 27, name: { en: 'Laylat al-Qadr (27th night)', ar: 'ليلة القدر (٢٧)', fr: 'Laylat al-Qadr (27e nuit)', id: 'Lailatul Qadar (malam ke-27)', ms: 'Lailatul Qadar (malam ke-27)', th: 'ลัยละตุลก็อดร์ (คืนที่ 27)', ur: 'لیلۃ القدر (ستائیسویں شب)' } },
  { id: 'eid-al-fitr', hijriMonth: 10, hijriDay: 1, name: { en: 'Eid al-Fitr', ar: 'عيد الفطر', fr: 'Aïd al-Fitr', id: 'Idulfitri', ms: 'Hari Raya Aidilfitri', th: 'อีดิลฟิฏริ', ur: 'عید الفطر' } },
  { id: 'arafah', hijriMonth: 12, hijriDay: 9, name: { en: 'Day of Arafah', ar: 'يوم عرفة', fr: "Jour d'Arafat", id: 'Hari Arafah', ms: 'Hari Arafah', th: 'วันอะเราะฟะฮ์', ur: 'یوم عرفہ' } },
  { id: 'eid-al-adha', hijriMonth: 12, hijriDay: 10, name: { en: 'Eid al-Adha', ar: 'عيد الأضحى', fr: 'Aïd al-Adha', id: 'Iduladha', ms: 'Hari Raya Aidiladha', th: 'อีดิลอัฎฮา', ur: 'عید الاضحیٰ' } },
];

export interface UpcomingEvent extends IslamicEvent {
  date: Date;
  daysAway: number;
}

/** The next `count` events from today (today included), soonest first. */
export function upcomingEvents(today: Date, count: number): UpcomingEvent[] {
  const out: UpcomingEvent[] = [];
  for (let i = 0; i <= 400 && out.length < count; i++) {
    const date = addDays(today, i);
    const h = toHijri(date);
    if (!h) continue;
    for (const e of ISLAMIC_EVENTS) {
      if (e.hijriMonth === h.month && e.hijriDay === h.day && out.length < count) out.push({ ...e, date, daysAway: i });
    }
  }
  return out;
}
