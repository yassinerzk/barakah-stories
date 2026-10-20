import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EMPTY_QUOTA,
  FREE_ENTITLEMENTS,
  grantAdReward,
  grantPro,
  isPro,
  recordStory,
  revokePro,
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
  /** Matches local Pro to the store's record: a renewal keeps it, an ended subscription removes it. */
  sync: () => Promise<void>;
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
          // The store's own record also says which plan it was.
          await get().sync();
        } catch {
          // Nothing restored; the screen stays as it was.
        } finally {
          set({ busy: false });
        }
      },
      sync: async () => {
        const check = await adapter.checkEntitlement?.();
        if (!check) return;
        const current = get().entitlements;
        if (check.active && (!isPro(current) || current.plan !== check.plan)) {
          set({ entitlements: grantPro(current, Date.now(), check.plan) });
        } else if (!check.active && isPro(current)) {
          set({ entitlements: revokePro(current) });
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
      countStory: () => set({ quota: recordStory(get().quota, Date.now()) }),
    }),
    {
      name: 'barakah.entitlements',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ entitlements: s.entitlements, firstOpenAt: s.firstOpenAt, quota: s.quota }),
      // v1 stored only entitlements; v2 counted stories per month. The daily count starts fresh.
      migrate: (persisted, version) => {
        const old = persisted as Partial<{ firstOpenAt: number }>;
        return { ...(persisted as object), quota: EMPTY_QUOTA, firstOpenAt: version >= 2 ? (old.firstOpenAt ?? 0) : 0 };
      },
      onRehydrateStorage: () => (state, error) => {
        // Written once, so the lifetime offer counts from the very first open.
        if (!error && state && state.firstOpenAt === 0) useEntitlementStore.setState({ firstOpenAt: Date.now() });
      },
    },
  ),
);
