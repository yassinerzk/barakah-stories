import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EMPTY_QUOTA,
  FREE_ENTITLEMENTS,
  grantAdReward,
  grantPro,
  recordStory,
  type AdOutcome,
  type Entitlements,
  type PlanPrices,
  type ProPlan,
  type PurchaseOutcome,
  type StoryQuota,
} from '@barakah/core';
import { adapter } from './adapter';

interface EntitlementState {
  entitlements: Entitlements;
  /** First time the app was opened (epoch ms); 0 until storage has loaded. Starts the lifetime offer. */
  firstOpenAt: number;
  /** Free stories shared this month, counted on this phone. */
  quota: StoryQuota;
  prices: PlanPrices;
  busy: boolean;
  purchasePro: (plan: ProPlan) => Promise<PurchaseOutcome>;
  restore: () => Promise<void>;
  watchAd: () => Promise<AdOutcome>;
  loadPrices: () => Promise<void>;
  countStory: () => void;
}

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set, get) => ({
      entitlements: FREE_ENTITLEMENTS,
      firstOpenAt: 0,
      quota: EMPTY_QUOTA,
      prices: {},
      busy: false,
      purchasePro: async (plan) => {
        set({ busy: true });
        try {
          const outcome = await adapter.purchasePro(plan);
          if (outcome === 'purchased') set({ entitlements: grantPro(get().entitlements, Date.now(), plan) });
          return outcome;
        } catch {
          return 'error';
        } finally {
          set({ busy: false });
        }
      },
      restore: async () => {
        set({ busy: true });
        try {
          const tier = await adapter.restorePurchases();
          if (tier === 'pro') set({ entitlements: grantPro(get().entitlements) });
        } finally {
          set({ busy: false });
        }
      },
      watchAd: async () => {
        set({ busy: true });
        try {
          const outcome = await adapter.showRewardedAd();
          if (outcome === 'rewarded') set({ entitlements: grantAdReward(get().entitlements) });
          return outcome;
        } catch {
          return 'error';
        } finally {
          set({ busy: false });
        }
      },
      loadPrices: async () => {
        try {
          set({ prices: await adapter.loadPrices() });
        } catch {
          // No prices yet: the Pro screen shows the plans without them.
        }
      },
      countStory: () => set({ quota: recordStory(get().quota, new Date()) }),
    }),
    {
      name: 'barakah.entitlements',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ entitlements: s.entitlements, firstOpenAt: s.firstOpenAt, quota: s.quota }),
      // Version 1 only stored entitlements; the new fields start fresh.
      migrate: (persisted) => ({ ...(persisted as object), quota: EMPTY_QUOTA, firstOpenAt: 0 }),
      onRehydrateStorage: () => (state, error) => {
        // Written once, so the lifetime offer counts from the very first open.
        if (!error && state && state.firstOpenAt === 0) useEntitlementStore.setState({ firstOpenAt: Date.now() });
      },
    },
  ),
);
