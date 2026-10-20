import {
  EMPTY_QUOTA,
  FREE_STORIES_PER_DAY,
  isFreeItem,
  LIFETIME_OFFER_MS,
  lifetimeOffer,
  PRO_PLANS,
  PRODUCT_IDS,
  quotaResetsAt,
  recordStory,
  STORY_WINDOW_MS,
  storiesLeft,
} from './pro';

const DAY = 24 * 60 * 60 * 1000;

describe('plans', () => {
  it('offers monthly, yearly and lifetime, each with its own store product', () => {
    expect([...PRO_PLANS]).toEqual(['monthly', 'yearly', 'lifetime']);
    const ids = PRO_PLANS.map((p) => PRODUCT_IDS[p]);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(/^barakah_pro_[a-z]+$/);
  });
});

describe('daily story allowance', () => {
  const HOUR = 60 * 60 * 1000;
  const first = Date.UTC(2026, 9, 20, 14, 32);
  const fill = (n: number) => {
    let q = EMPTY_QUOTA;
    for (let i = 0; i < n; i++) q = recordStory(q, first + i * HOUR);
    return q;
  };

  it('starts with the full allowance and no reset time', () => {
    expect(FREE_STORIES_PER_DAY).toBe(5);
    expect(storiesLeft(EMPTY_QUOTA, first)).toBe(5);
    expect(quotaResetsAt(EMPTY_QUOTA, first)).toBeNull();
  });

  it('counts down with each story and never below zero', () => {
    const q = fill(6);
    expect(storiesLeft(q, first + 6 * HOUR)).toBe(0);
    expect(q.used).toBe(6);
  });

  it('resets 24 hours after the first story of the window, not at midnight', () => {
    const q = fill(5);
    expect(quotaResetsAt(q, first + 5 * HOUR)).toBe(first + STORY_WINDOW_MS);
    expect(storiesLeft(q, first + STORY_WINDOW_MS - 1)).toBe(0);
    expect(storiesLeft(q, first + STORY_WINDOW_MS)).toBe(5);
    expect(recordStory(q, first + STORY_WINDOW_MS)).toEqual({ windowStart: first + STORY_WINDOW_MS, used: 1 });
  });

  it('does not change the quota it was given', () => {
    const q = recordStory(EMPTY_QUOTA, first);
    recordStory(q, first);
    expect(q.used).toBe(1);
  });

  it('does not reset when the clock is set back', () => {
    const q = fill(5);
    expect(storiesLeft(q, first - 3 * HOUR)).toBe(0);
  });
});

describe('lifetime offer', () => {
  const opened = Date.UTC(2026, 9, 19, 8);

  it('lasts three days from the first open', () => {
    expect(LIFETIME_OFFER_MS).toBe(3 * DAY);
    const start = lifetimeOffer(opened, opened);
    expect(start).toMatchObject({ available: true, daysLeft: 3, msLeft: 3 * DAY });
  });

  it('rounds the days left up, so the last hours still read "1 day left"', () => {
    expect(lifetimeOffer(opened, opened + DAY + 1).daysLeft).toBe(2);
    expect(lifetimeOffer(opened, opened + 3 * DAY - 60_000).daysLeft).toBe(1);
  });

  it('expires after three days and stays expired', () => {
    for (const later of [3 * DAY, 3 * DAY + 1, 40 * DAY]) {
      expect(lifetimeOffer(opened, opened + later)).toEqual({ available: false, msLeft: 0, daysLeft: 0 });
    }
  });

  it('treats a clock set before the first open as the start, not as extra time', () => {
    expect(lifetimeOffer(opened, opened - 10 * DAY).msLeft).toBe(3 * DAY);
  });
});

describe('free items', () => {
  it('keeps the first few of a list free and the rest for Pro', () => {
    expect(isFreeItem(0, 3)).toBe(true);
    expect(isFreeItem(2, 3)).toBe(true);
    expect(isFreeItem(3, 3)).toBe(false);
    expect(isFreeItem(-1, 3)).toBe(false);
  });
});
