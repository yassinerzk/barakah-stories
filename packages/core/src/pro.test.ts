import {
  EMPTY_QUOTA,
  FREE_STORIES_PER_MONTH,
  isFreeItem,
  LIFETIME_OFFER_MS,
  lifetimeOffer,
  monthKey,
  PRO_PLANS,
  PRODUCT_IDS,
  recordStory,
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

describe('monthly story allowance', () => {
  const oct = new Date(2026, 9, 19, 12);

  it('keys months by local calendar month', () => {
    expect(monthKey(new Date(2026, 0, 31, 23, 59))).toBe('2026-01');
    expect(monthKey(new Date(2026, 9, 1, 0, 0))).toBe('2026-10');
  });

  it('starts with the full allowance', () => {
    expect(storiesLeft(EMPTY_QUOTA, oct)).toBe(FREE_STORIES_PER_MONTH);
    expect(FREE_STORIES_PER_MONTH).toBe(3);
  });

  it('counts down with each story and never below zero', () => {
    let q = EMPTY_QUOTA;
    for (let i = 0; i < 5; i++) q = recordStory(q, oct);
    expect(storiesLeft(q, oct)).toBe(0);
    expect(q.used).toBe(5);
  });

  it('does not change the quota it was given', () => {
    const q = recordStory(EMPTY_QUOTA, oct);
    recordStory(q, oct);
    expect(q.used).toBe(1);
  });

  it('starts again on the first of the next month', () => {
    let q = EMPTY_QUOTA;
    for (let i = 0; i < 3; i++) q = recordStory(q, oct);
    const nov = new Date(2026, 10, 1, 0, 1);
    expect(storiesLeft(q, nov)).toBe(3);
    expect(recordStory(q, nov)).toEqual({ month: '2026-11', used: 1 });
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
