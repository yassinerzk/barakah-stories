import { NOOP_ADAPTER, TIP_FALLBACK_PRICES, type MonetizationAdapter } from '@barakah/core';
import { REVENUECAT_ADAPTER, revenueCatAvailable } from './revenuecat';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Simulates billing and ads so the flow can be exercised in Expo Go.
 * Replaced by RevenueCat + AdMob adapters in a native build (docs/MONETIZATION.md).
 */
export const DEV_ADAPTER: MonetizationAdapter = {
  id: 'dev',
  purchasePro: async () => {
    await wait(800);
    return 'purchased';
  },
  restorePurchases: async () => {
    await wait(400);
    return 'free';
  },
  showRewardedAd: async () => {
    await wait(1500);
    return 'rewarded';
  },
  // Sample prices; the real ones come from Google Play / the App Store.
  loadPrices: async () => ({ monthly: '$2.49', yearly: '$19.99', lifetime: '$39.99' }),
  sendTip: async () => {
    await wait(800);
    return 'purchased';
  },
  loadTipPrices: async () => ({ ...TIP_FALLBACK_PRICES }),
};

/**
 * The adapter this build uses: RevenueCat in a store build that has its key,
 * the simulated store in development (Expo Go), otherwise none.
 */
export const adapter: MonetizationAdapter = revenueCatAvailable ? REVENUECAT_ADAPTER : __DEV__ ? DEV_ADAPTER : NOOP_ADAPTER;

/**
 * Whether buying or earning anything is actually possible in this build.
 *
 * False while the placeholder adapter is in place, which is what ships today:
 * no billing or ads SDK is wired up yet. The UI keeps showing what is coming
 * but must not invite a tap that can only end in "not available".
 * Becomes true on its own the moment a real adapter is selected above.
 */
export const monetizationReady = adapter.id !== NOOP_ADAPTER.id;

/**
 * Pro locks only apply where Pro can be bought. A build without billing keeps
 * every feature open: locking people out of something they cannot pay for
 * would just take features away.
 */
export const proLocksActive = monetizationReady;
