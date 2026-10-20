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

/** Free users share this many image stories per window. */
export const FREE_STORIES_PER_DAY = 5;
/** The window opens with the first story and lasts 24 hours (not midnight to midnight). */
export const STORY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Stories shared in the current window, counted on this phone. */
export interface StoryQuota {
  /** Epoch ms of the window's first story; 0 when no window is open. */
  windowStart: number;
  used: number;
}

export const EMPTY_QUOTA: StoryQuota = { windowStart: 0, used: 0 };

/** Open until 24 hours after its first story; a clock set back never reopens the allowance. */
function windowOpen(quota: StoryQuota, now: number): boolean {
  return quota.windowStart > 0 && now - quota.windowStart < STORY_WINDOW_MS;
}

export function storiesLeft(quota: StoryQuota, now: number): number {
  return Math.max(0, FREE_STORIES_PER_DAY - (windowOpen(quota, now) ? quota.used : 0));
}

/** A new quota with one more story counted; the first story after a window closes opens a new one. */
export function recordStory(quota: StoryQuota, now: number): StoryQuota {
  return windowOpen(quota, now) ? { windowStart: quota.windowStart, used: quota.used + 1 } : { windowStart: now, used: 1 };
}

/** When the allowance is full again (epoch ms), or null when no window is open. */
export function quotaResetsAt(quota: StoryQuota, now: number): number | null {
  return windowOpen(quota, now) ? quota.windowStart + STORY_WINDOW_MS : null;
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
/** Wallpapers are all Pro. */
export const FREE_WALLPAPERS = 0;

export function isFreeItem(index: number, freeCount: number): boolean {
  return index >= 0 && index < freeCount;
}
