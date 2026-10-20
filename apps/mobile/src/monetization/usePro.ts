import { useRouter } from 'expo-router';
import { isPro } from '@barakah/core';
import { useEntitlementStore } from './store';
import { proLocksActive } from './adapter';

/** Why the Pro screen was opened; it leads with the matching line. */
export type ProReason = 'stories' | 'video' | 'style' | 'wallpaper' | 'practice' | 'watermark' | 'adhan' | 'feature';

/** `locked` is what callers check: true only for free users in a build that can sell Pro. */
export function usePro() {
  const router = useRouter();
  const pro = useEntitlementStore((s) => isPro(s.entitlements));
  return {
    pro,
    locked: proLocksActive && !pro,
    /** `params` carries extra context, e.g. `resetAt` (epoch ms) when the daily stories are used up. */
    openPro: (reason?: ProReason, params?: Record<string, string>) =>
      router.push({ pathname: '/pro', params: { ...(reason ? { reason } : {}), ...params } }),
  };
}
