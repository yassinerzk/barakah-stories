import {
  AD_REWARD_DURATION_MS,
  canRemoveWatermark,
  FREE_ENTITLEMENTS,
  grantAdReward,
  grantPro,
  NOOP_ADAPTER,
  revokePro,
  shouldShowWatermark,
} from './monetization';

describe('monetization', () => {
  const now = 1_700_000_000_000;

  it('free users always get the watermark', () => {
    expect(canRemoveWatermark(FREE_ENTITLEMENTS, now)).toBe(false);
    expect(shouldShowWatermark(true, FREE_ENTITLEMENTS, now)).toBe(true);
    expect(shouldShowWatermark(false, FREE_ENTITLEMENTS, now)).toBe(true);
  });

  it('pro users can hide it, and only when they ask', () => {
    const pro = grantPro(FREE_ENTITLEMENTS, now);
    expect(shouldShowWatermark(true, pro, now)).toBe(false);
    expect(shouldShowWatermark(false, pro, now)).toBe(true);
  });

  it('a rewarded ad removes it for a day and stacks', () => {
    const once = grantAdReward(FREE_ENTITLEMENTS, now);
    expect(once.adRewardUntil).toBe(now + AD_REWARD_DURATION_MS);
    expect(canRemoveWatermark(once, now + AD_REWARD_DURATION_MS - 1)).toBe(true);
    expect(canRemoveWatermark(once, now + AD_REWARD_DURATION_MS)).toBe(false);
    const twice = grantAdReward(once, now + 1000);
    expect(twice.adRewardUntil).toBe(now + 2 * AD_REWARD_DURATION_MS);
  });

  it('an ended subscription returns the account to free, keeping an ad reward', () => {
    const pro = grantPro(grantAdReward(FREE_ENTITLEMENTS, now), now, 'monthly');
    const ended = revokePro(pro, now + 1);
    expect(ended.tier).toBe('free');
    expect(ended.plan).toBeUndefined();
    expect(ended.adRewardUntil).toBe(pro.adRewardUntil);
    expect(pro.tier).toBe('pro');
  });

  it('the placeholder adapter reports nothing is available', async () => {
    expect(await NOOP_ADAPTER.purchasePro('yearly')).toBe('unavailable');
    expect(await NOOP_ADAPTER.loadPrices()).toEqual({});
    expect(await NOOP_ADAPTER.showRewardedAd()).toBe('unavailable');
    expect(await NOOP_ADAPTER.restorePurchases()).toBe('free');
  });
});
