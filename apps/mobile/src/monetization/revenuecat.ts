import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type Purchases from 'react-native-purchases';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import {
  PRO_PLANS,
  PRODUCT_IDS,
  type EntitlementCheck,
  type MonetizationAdapter,
  type PlanPrices,
  type ProPlan,
} from '@barakah/core';

/*
 * Real purchases through RevenueCat, which talks to Google Play Billing and
 * the App Store. The keys are RevenueCat's *public* SDK keys, safe to ship.
 * Setup: docs/MONETIZATION.md → "Steps to take payments".
 */

/** The RevenueCat entitlement every Pro product unlocks. */
const ENTITLEMENT_ID = 'pro';
const API_KEY =
  Platform.select({
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  }) ?? '';

/** Only store builds with a key: Expo Go and the web have no billing, and keep the simulated store. */
export const revenueCatAvailable =
  API_KEY.length > 0 && Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let purchases: typeof Purchases | null = null;

/** Loaded and configured on first use, so builds without RevenueCat never touch the SDK. */
function sdk(): typeof Purchases {
  if (!purchases) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = (require('react-native-purchases') as { default: typeof Purchases }).default;
    loaded.configure({ apiKey: API_KEY });
    purchases = loaded;
  }
  return purchases;
}

/** Google reports subscriptions as "product:basePlan", the App Store as the bare product id. */
function planOfProduct(id: string): ProPlan | undefined {
  return PRO_PLANS.find((p) => id === PRODUCT_IDS[p] || id.startsWith(`${PRODUCT_IDS[p]}:`));
}

function entitlementOf(info: CustomerInfo): EntitlementCheck {
  const active = info.entitlements.active[ENTITLEMENT_ID];
  return active ? { active: true, plan: planOfProduct(active.productIdentifier) } : { active: false };
}

/** The current offering's package for each plan, matched by product id, then by package type. */
async function packagesByPlan(): Promise<Partial<Record<ProPlan, PurchasesPackage>>> {
  const offering = (await sdk().getOfferings()).current;
  if (!offering) return {};
  const byPlan: Partial<Record<ProPlan, PurchasesPackage>> = {};
  for (const pkg of offering.availablePackages) {
    const plan = planOfProduct(pkg.product.identifier);
    if (plan && !byPlan[plan]) byPlan[plan] = pkg;
  }
  return {
    monthly: byPlan.monthly ?? offering.monthly ?? undefined,
    yearly: byPlan.yearly ?? offering.annual ?? undefined,
    lifetime: byPlan.lifetime ?? offering.lifetime ?? undefined,
  };
}

export const REVENUECAT_ADAPTER: MonetizationAdapter = {
  id: 'revenuecat',
  purchasePro: async (plan) => {
    try {
      const pkg = (await packagesByPlan())[plan];
      if (!pkg) return 'unavailable';
      const { customerInfo } = await sdk().purchasePackage(pkg);
      return entitlementOf(customerInfo).active ? 'purchased' : 'error';
    } catch (e) {
      return (e as { userCancelled?: boolean }).userCancelled ? 'cancelled' : 'error';
    }
  },
  restorePurchases: async () => (entitlementOf(await sdk().restorePurchases()).active ? 'pro' : 'free'),
  // Ads are not part of this build.
  showRewardedAd: async () => 'unavailable',
  loadPrices: async () => {
    const packages = await packagesByPlan();
    const prices: PlanPrices = {};
    for (const plan of PRO_PLANS) {
      const pkg = packages[plan];
      if (pkg) prices[plan] = pkg.product.priceString;
    }
    return prices;
  },
  checkEntitlement: async () => {
    try {
      return entitlementOf(await sdk().getCustomerInfo());
    } catch {
      // Offline: keep what the app last knew.
      return null;
    }
  },
};
