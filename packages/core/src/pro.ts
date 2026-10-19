/**
 * Barakah Pro: the plans, the free story allowance and the launch offer.
 *
 * Prayer times, the Quran and hadith are never part of Pro. Free users keep
 * three image stories a month and a starter set of every style choice; Pro
 * adds unlimited and video stories, every style and wallpaper, no app name on
 * stories, and the daily-practice tools.
 */

export type ProPlan = 'monthly' | 'yearly' | 'lifetime';
export const PRO_PLANS: readonly ProPlan[] = ['monthly', 'yearly', 'lifetime'];

/** Product ids, identical in Google Play Console, App Store Connect and RevenueCat. */
export const PRODUCT_IDS: Readonly<Record<ProPlan, string>> = {
  monthly: 'barakah_pro_monthly',
  yearly: 'barakah_pro_yearly',
  lifetime: 'barakah_pro_lifetime',
};

/* ------------------------------ story allowance ------------------------------ */

export const FREE_STORIES_PER_MONTH = 3;

/** Stories shared in one calendar month, counted on this phone. */
export interface StoryQuota {
  /** "YYYY-MM" in local time. */
  month: string;
  used: number;
}

export const EMPTY_QUOTA: StoryQuota = { month: '', used: 0 };

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function usedThisMonth(quota: StoryQuota, now: Date): number {
  return quota.month === monthKey(now) ? quota.used : 0;
}

export function storiesLeft(quota: StoryQuota, now: Date): number {
  return Math.max(0, FREE_STORIES_PER_MONTH - usedThisMonth(quota, now));
}

/** A new quota with one more story counted; a new month starts from zero. */
export function recordStory(quota: StoryQuota, now: Date): StoryQuota {
  return { month: monthKey(now), used: usedThisMonth(quota, now) + 1 };
}

/* ------------------------------- lifetime offer ------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
/** The one-time purchase is offered for this long after the first open. */
export const LIFETIME_OFFER_MS = 3 * DAY_MS;

export interface LifetimeOffer {
  available: boolean;
  msLeft: number;
  /** Rounded up: the last hours still read "1 day left". */
  daysLeft: number;
}

export function lifetimeOffer(firstOpenAt: number, now: number): LifetimeOffer {
  // A clock set back before the first open is not extra time.
  const elapsed = Math.max(0, now - firstOpenAt);
  const msLeft = Math.max(0, LIFETIME_OFFER_MS - elapsed);
  return msLeft > 0 ? { available: true, msLeft, daysLeft: Math.ceil(msLeft / DAY_MS) } : { available: false, msLeft: 0, daysLeft: 0 };
}

/* --------------------------------- free items -------------------------------- */

/** How many of each list free users can pick; the rest need Pro. */
export const FREE_THEMES = 3;
export const FREE_PHOTOS = 3;
/** Includes "none". */
export const FREE_DECORATIONS = 3;
export const FREE_ARABIC_FONTS = 2;
export const FREE_WALLPAPERS = 6;

export function isFreeItem(index: number, freeCount: number): boolean {
  return index >= 0 && index < freeCount;
}
