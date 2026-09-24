import { describe, expect, it } from 'vitest';

import {
  describeRecurrence,
  followingOccurrences,
  joinWords,
  occurrences,
  recurrenceCost,
  remainingOccurrences,
  type Recurrence,
  type RecurrenceLabels,
} from './recurrence';

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const labels: RecurrenceLabels = {
  weekdayShort: (i) => SHORT[i]!,
  date: (ms) => {
    const d = new Date(ms);
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  },
};

/** Monday 24 August 2026. */
const MON = new Date(2026, 7, 24, 9, 0, 0, 0);
const on = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();

const weekly = (over: Partial<Recurrence> = {}): Recurrence => ({
  freq: 'weekly',
  interval: 1,
  ends: 'never',
  ...over,
});

describe('describeRecurrence', () => {
  it('writes the sentence the design prints', () => {
    const r = weekly({
      interval: 2,
      byWeekday: [1, 3, 5],
      ends: 'onDate',
      endsOn: on(2026, 12, 12),
    });

    expect(describeRecurrence(r, labels)).toBe(
      'Every 2 weeks on Mon, Wed and Fri, until 12 December',
    );
  });

  it('says "Every weekday" rather than listing five days', () => {
    expect(describeRecurrence(weekly({ byWeekday: [1, 2, 3, 4, 5] }), labels)).toBe(
      'Every weekday',
    );
  });

  it('does not collapse to "Every weekday" when the interval is not one', () => {
    expect(describeRecurrence(weekly({ interval: 2, byWeekday: [1, 2, 3, 4, 5] }), labels)).toBe(
      'Every 2 weeks on Mon, Tue, Wed, Thu and Fri',
    );
  });

  it('orders the days from Monday, whatever order they were tapped in', () => {
    expect(describeRecurrence(weekly({ byWeekday: [5, 0, 1] }), labels)).toBe(
      'Every week on Mon, Fri and Sun',
    );
  });

  it('writes the other frequencies', () => {
    expect(describeRecurrence({ freq: 'daily', interval: 1, ends: 'never' }, labels)).toBe(
      'Every day',
    );
    expect(describeRecurrence({ freq: 'daily', interval: 3, ends: 'never' }, labels)).toBe(
      'Every 3 days',
    );
    expect(describeRecurrence({ freq: 'monthly', interval: 1, ends: 'never' }, labels)).toBe(
      'Every month',
    );
    expect(describeRecurrence({ freq: 'yearly', interval: 2, ends: 'never' }, labels)).toBe(
      'Every 2 years',
    );
  });

  it('writes a count when it ends after N', () => {
    expect(describeRecurrence(weekly({ ends: 'afterN', endsAfter: 12 }), labels)).toBe(
      'Every week, 12 times',
    );
    expect(describeRecurrence(weekly({ ends: 'afterN', endsAfter: 1 }), labels)).toBe(
      'Every week, 1 time',
    );
  });

  it('says so plainly when there is no rule', () => {
    expect(describeRecurrence(null, labels)).toBe('Does not repeat');
  });
});

describe('occurrences', () => {
  it('lands on every chosen weekday', () => {
    const dates = occurrences(weekly({ byWeekday: [1, 3, 5], ends: 'afterN', endsAfter: 6 }), MON);

    expect(dates.map((d) => d.getDate())).toEqual([24, 26, 28, 31, 2, 4]);
  });

  it('skips whole weeks on an interval, not alternate matching days', () => {
    // The fault worth a test: stepping by "every other match" would give Mon, Fri,
    // Wed — three different weeks — instead of two days in one week then a week off.
    const dates = occurrences(
      weekly({ interval: 2, byWeekday: [1, 3], ends: 'afterN', endsAfter: 4 }),
      MON,
    );

    expect(dates.map((d) => `${d.getMonth() + 1}/${d.getDate()}`)).toEqual([
      '8/24',
      '8/26',
      '9/7',
      '9/9',
    ]);
  });

  it('stops on the end date rather than past it', () => {
    const dates = occurrences(weekly({ ends: 'onDate', endsOn: on(2026, 9, 14) }), MON);

    expect(dates).toHaveLength(4); // 24, 31 Aug; 7, 14 Sep
    expect(dates[dates.length - 1]!.getDate()).toBe(14);
  });

  it('never runs away when the rule has no end', () => {
    expect(occurrences({ freq: 'daily', interval: 1, ends: 'never' }, MON, 50)).toHaveLength(50);
  });

  it('walks months and years by their own units', () => {
    const monthly = occurrences(
      { freq: 'monthly', interval: 1, ends: 'afterN', endsAfter: 3 },
      MON,
    );
    expect(monthly.map((d) => d.getMonth())).toEqual([7, 8, 9]);

    const yearly = occurrences({ freq: 'yearly', interval: 1, ends: 'afterN', endsAfter: 2 }, MON);
    expect(yearly.map((d) => d.getFullYear())).toEqual([2026, 2027]);
  });
});

describe('remainingOccurrences', () => {
  it('counts what the record commits to beyond itself', () => {
    // Twelve occurrences means this one plus eleven more.
    expect(remainingOccurrences(weekly({ ends: 'afterN', endsAfter: 12 }), MON)).toBe(11);
  });

  it('returns null for a rule that never ends', () => {
    expect(remainingOccurrences(weekly(), MON)).toBeNull();
  });

  it('counts to an end date', () => {
    expect(remainingOccurrences(weekly({ ends: 'onDate', endsOn: on(2026, 9, 14) }), MON)).toBe(3);
  });
});

describe('recurrenceCost', () => {
  it('writes the line the design prints', () => {
    const r = weekly({
      interval: 2,
      byWeekday: [1, 3, 5],
      ends: 'onDate',
      endsOn: on(2026, 12, 12),
    });

    // The mockup prints "26 more of these", but its number is illustrative — the design
    // never says which day the rule starts from. Counted from Monday 24 August, the
    // fortnights beginning 24 Aug, 7 and 21 Sep, 5 and 19 Oct, 2, 16 and 30 Nov each
    // contribute three days, and 14 December is past the end date: 24 occurrences, so
    // 23 beyond the one being created.
    expect(recurrenceCost(r, MON, 40)).toBe('23 more of these. Each one costs its day 40m.');
  });

  it('does not round "forever" into a number', () => {
    // The one place the product is counting; printing the internal cap would be a lie.
    expect(recurrenceCost(weekly(), MON, 40)).toBe(
      'This does not end. Each one costs its day 40m.',
    );
  });

  it('says nothing when there is nothing to say', () => {
    expect(recurrenceCost(null, MON, 40)).toBeNull();
    expect(recurrenceCost(weekly({ ends: 'afterN', endsAfter: 1 }), MON, 40)).toBeNull();
  });

  it('leaves the cost off a record that costs its day nothing', () => {
    expect(recurrenceCost(weekly({ ends: 'afterN', endsAfter: 5 }), MON, 0)).toBe(
      '4 more of these.',
    );
  });
});

describe('joinWords', () => {
  it('joins the way the copy does', () => {
    expect(joinWords(['Mon'])).toBe('Mon');
    expect(joinWords(['Mon', 'Fri'])).toBe('Mon and Fri');
    expect(joinWords(['Mon', 'Wed', 'Fri'])).toBe('Mon, Wed and Fri');
    expect(joinWords([])).toBe('');
  });
});

describe('followingOccurrences', () => {
  const seed = new Date(2026, 7, 26, 7, 0, 0, 0); // Wednesday 26 August 2026

  it('leaves out the day it starts from, which the record already occupies', () => {
    const rest = followingOccurrences(
      { freq: 'daily', interval: 1, ends: 'afterN', endsAfter: 4 },
      seed,
    );

    expect(rest).toHaveLength(3);
    expect(rest.every((d) => d.getTime() > seed.getTime())).toBe(true);
  });

  it('writes out exactly what the editor promised', () => {
    // "26 more of these" has to be 26 records, or the sentence is decoration.
    const rule: Recurrence = {
      freq: 'weekly',
      interval: 1,
      byWeekday: [seed.getDay()],
      ends: 'afterN',
      endsAfter: 27,
    };

    expect(followingOccurrences(rule, seed, 400)).toHaveLength(26);
  });

  it('stops at the horizon for a rule that never ends', () => {
    const rest = followingOccurrences({ freq: 'daily', interval: 1, ends: 'never' }, seed, 10);

    expect(rest).toHaveLength(10);
  });

  it('stops on the end date when one is set', () => {
    const endsOn = new Date(2026, 8, 9).getTime(); // two weeks later
    const rest = followingOccurrences(
      { freq: 'weekly', interval: 1, byWeekday: [seed.getDay()], ends: 'onDate', endsOn },
      seed,
    );

    expect(rest).toHaveLength(2);
  });

  it('gives midnights, and leaves the time of day to the record', () => {
    const rest = followingOccurrences(
      { freq: 'daily', interval: 1, ends: 'afterN', endsAfter: 2 },
      seed,
    );

    expect(rest[0]?.getHours()).toBe(0);
    expect(rest[0]?.getMinutes()).toBe(0);
  });
});
