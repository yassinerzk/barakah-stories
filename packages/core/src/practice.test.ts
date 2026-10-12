import {
  addDays,
  dayKey,
  DEEDS,
  deedStats,
  DHIKR_PRESETS,
  hijriMonth,
  tallyAdd,
  tallyStats,
  toggleDeed,
  upcomingEvents,
  type DeedLog,
} from './practice';
import { toHijri } from './hijri';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12);

describe('dayKey', () => {
  it('is the local calendar day, zero-padded', () => {
    expect(dayKey(d(2026, 3, 7))).toBe('2026-03-07');
  });
  it('steps across months and years', () => {
    expect(dayKey(addDays(d(2026, 12, 31), 1))).toBe('2027-01-01');
    expect(dayKey(addDays(d(2026, 3, 1), -1))).toBe('2026-02-28');
  });
});

describe('tasbih tally', () => {
  it('adds to the day and keeps the past', () => {
    let tally = tallyAdd({}, d(2026, 10, 12), 30);
    tally = tallyAdd(tally, d(2026, 10, 13), 5);
    tally = tallyAdd(tally, d(2026, 10, 13), 2);
    expect(tallyStats(tally, d(2026, 10, 13))).toEqual({ today: 7, yesterday: 30, allTime: 37 });
  });
  it('never goes below zero on undo', () => {
    const tally = tallyAdd({}, d(2026, 10, 13), -3);
    expect(tallyStats(tally, d(2026, 10, 13)).today).toBe(0);
  });
  it('returns a new object, leaving the old one untouched', () => {
    const before = {};
    const after = tallyAdd(before, d(2026, 10, 13), 1);
    expect(before).toEqual({});
    expect(after).not.toBe(before);
  });
  it('ships the classic presets with Arabic and a meaning', () => {
    expect(DHIKR_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const p of DHIKR_PRESETS) {
      expect(p.arabic).toBeTruthy();
      expect(p.meaning.en).toBeTruthy();
    }
  });
});

describe('daily deeds', () => {
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const allPrayers = (log: DeedLog, day: Date) => prayers.reduce((l, p) => toggleDeed(l, day, p), log);

  it('toggles a deed on and off for a day', () => {
    const on = toggleDeed({}, d(2026, 10, 13), 'quran');
    expect(on['2026-10-13']).toEqual(['quran']);
    const off = toggleDeed(on, d(2026, 10, 13), 'quran');
    expect(off['2026-10-13']).toEqual([]);
  });

  it('counts a day toward the streak once all five prayers are ticked', () => {
    let log: DeedLog = {};
    log = allPrayers(log, d(2026, 10, 11));
    log = allPrayers(log, d(2026, 10, 12));
    log = toggleDeed(log, d(2026, 10, 13), 'fajr');
    const s = deedStats(log, d(2026, 10, 13));
    // Today is not finished yet, so the streak still stands from yesterday.
    expect(s.streak).toBe(2);
    expect(s.doneToday).toBe(1);
    expect(s.total).toBe(DEEDS.length);
  });

  it('breaks the streak on a missed day and remembers the best run', () => {
    let log: DeedLog = {};
    for (const day of [1, 2, 3]) log = allPrayers(log, d(2026, 10, day));
    for (const day of [5, 6]) log = allPrayers(log, d(2026, 10, day));
    const s = deedStats(log, d(2026, 10, 6));
    expect(s.streak).toBe(2);
    expect(s.best).toBe(3);
  });

  it('gives the last seven days, oldest first, ending today', () => {
    const log = allPrayers({}, d(2026, 10, 13));
    const week = deedStats(log, d(2026, 10, 13)).week;
    expect(week).toHaveLength(7);
    expect(week[6]).toMatchObject({ key: '2026-10-13', done: 5 });
    expect(week[0].key).toBe('2026-10-07');
  });
});

describe('hijri calendar', () => {
  it('lays out the whole Hijri month that contains the date, starting on day 1', () => {
    const month = hijriMonth(d(2026, 10, 13), 0);
    expect(month.days[0].hijriDay).toBe(1);
    expect(month.days.length).toBeGreaterThanOrEqual(29);
    expect(month.days.length).toBeLessThanOrEqual(30);
    for (const day of month.days) expect(toHijri(day.date)!.month).toBe(month.month);
  });

  it('moves a month forward and back', () => {
    const now = hijriMonth(d(2026, 10, 13), 0);
    const next = hijriMonth(d(2026, 10, 13), 1);
    const prev = hijriMonth(d(2026, 10, 13), -1);
    expect(next.month).toBe((now.month % 12) + 1);
    expect(prev.month).toBe(now.month === 1 ? 12 : now.month - 1);
  });

  it('lists the coming events in date order, each in the future', () => {
    const today = d(2026, 10, 13);
    const events = upcomingEvents(today, 4);
    expect(events).toHaveLength(4);
    for (let i = 1; i < events.length; i++) expect(events[i].date.getTime()).toBeGreaterThanOrEqual(events[i - 1].date.getTime());
    for (const e of events) expect(e.daysAway).toBeGreaterThanOrEqual(0);
    const ramadan = upcomingEvents(today, 12).find((e) => e.id === 'ramadan')!;
    expect(toHijri(ramadan.date)).toMatchObject({ month: 9, day: 1 });
  });
});
