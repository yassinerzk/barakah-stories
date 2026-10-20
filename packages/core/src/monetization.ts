/**
 * Monetization foundation. The app decides what a user may do from an
 * `Entitlements` value; how that value is obtained (in-app purchase,
 * rewarded ad, server record) is behind `MonetizationAdapter`, so billing
 * and ad SDKs can be added later without touching the UI.
 */

import type { ProPlan } from './pro';

export const APP_NAME = 'Barakah Stories';

/** Text drawn at the bottom of every story for free users. */
export const WATERMARK_TEXT = APP_NAME;

export type Tier = 'free' | 'pro';

export interface Entitlements {
  tier: Tier;
  /** Which Pro plan was bought, when known. */
  plan?: ProPlan;
  /** Epoch ms until which a rewarded ad keeps stories watermark-free. */
  adRewardUntil: number;
  /** When these entitlements were last confirmed (purchase restore, server sync). */
  updatedAt: number;
}

export const FREE_ENTITLEMENTS: Entitlements = { tier: 'free', adRewardUntil: 0, updatedAt: 0 };

/** How long one rewarded ad removes the watermark. */
export const AD_REWARD_DURATION_MS = 24 * 60 * 60 * 1000;

export function isPro(e: Entitlements): boolean {
  return e.tier === 'pro';
}

export function hasAdReward(e: Entitlements, now = Date.now()): boolean {
  return e.adRewardUntil > now;
}

/** Whether the user may publish a story without the app name on it. */
export function canRemoveWatermark(e: Entitlements, now = Date.now()): boolean {
  return isPro(e) || hasAdReward(e, now);
}

/** True when the watermark must be drawn for this design and user. */
export function shouldShowWatermark(hideRequested: boolean, e: Entitlements, now = Date.now()): boolean {
  return !(hideRequested && canRemoveWatermark(e, now));
}

export function grantAdReward(e: Entitlements, now = Date.now()): Entitlements {
  return { ...e, adRewardUntil: Math.max(e.adRewardUntil, now) + AD_REWARD_DURATION_MS, updatedAt: now };
}

export function grantPro(e: Entitlements, now = Date.now(), plan?: ProPlan): Entitlements {
  return { ...e, tier: 'pro', plan: plan ?? e.plan, updatedAt: now };
}

/** A subscription that ended (cancelled, refunded, lapsed): back to free. An ad reward stays. */
export function revokePro(e: Entitlements, now = Date.now()): Entitlements {
  return { tier: 'free', adRewardUntil: e.adRewardUntil, updatedAt: now };
}

/**
 * "Support the app" tips: one-off consumable purchases that unlock nothing.
 * They go to the app's development (store rules allow that as in-app products;
 * a donation to a charity would not be).
 */
export type TipSize = 'small' | 'medium' | 'large';
export const TIP_SIZES: readonly TipSize[] = ['small', 'medium', 'large'];
export const TIP_PRODUCT_IDS: Readonly<Record<TipSize, string>> = {
  small: 'barakah_tip_1',
  medium: 'barakah_tip_2',
  large: 'barakah_tip_5',
};
/** Shown until the store answers with prices in the person's currency. */
export const TIP_FALLBACK_PRICES: Readonly<Record<TipSize, string>> = { small: '$1', medium: '$2', large: '$5' };
export type TipPrices = Partial<Record<TipSize, string>>;

/** What the store currently says about the person's Pro access. */
export interface EntitlementCheck {
  active: boolean;
  plan?: ProPlan;
}

/** Localised store prices per plan ("€2.99"), filled in once the store has answered. */
export type PlanPrices = Partial<Record<ProPlan, string>>;

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'unavailable' | 'error';
export type AdOutcome = 'rewarded' | 'dismissed' | 'unavailable' | 'error';

/**
 * Bridge to the platform's billing and ads. Implementations planned:
 * RevenueCat (App Store / Play Billing) and Google AdMob rewarded ads.
 * See docs/MONETIZATION.md.
 */
export interface MonetizationAdapter {
  readonly id: string;
  purchasePro(plan: ProPlan): Promise<PurchaseOutcome>;
  restorePurchases(): Promise<Tier>;
  showRewardedAd(): Promise<AdOutcome>;
  /** Prices as the store will charge them, in the person's currency. */
  loadPrices(): Promise<PlanPrices>;
  /**
   * The store's current answer, checked at launch and on return to the app,
   * so an ended subscription stops Pro. Null when the store can't be reached.
   * Adapters without a real store leave it out.
   */
  checkEntitlement?(): Promise<EntitlementCheck | null>;
  /** A one-off tip; it unlocks nothing. Adapters without a real store leave these out. */
  sendTip?(size: TipSize): Promise<PurchaseOutcome>;
  loadTipPrices?(): Promise<TipPrices>;
}

/** Adapter used until a billing/ads SDK is integrated. */
export const NOOP_ADAPTER: MonetizationAdapter = {
  id: 'noop',
  purchasePro: async () => 'unavailable',
  loadPrices: async () => ({}),
  restorePurchases: async () => 'free',
  showRewardedAd: async () => 'unavailable',
};
