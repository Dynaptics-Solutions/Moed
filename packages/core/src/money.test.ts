import { describe, expect, it } from 'vitest';

import { capacity } from './capacity';
import { remainingLabel } from './format';
import { formatMoney, money, weeklyBillsMinor, weeklyShareMinor } from './money';

describe('formatMoney', () => {
  it('writes no digit it does not mean', () => {
    // The same rule as hours: "9h" never becomes "9h 0m", and £980 never becomes
    // £980.00. A padded figure claims a precision the number does not have.
    expect(formatMoney(98_000)).toBe('£980');
    expect(formatMoney(2_460)).toBe('£24.60');
    expect(formatMoney(0)).toBe('£0');
    expect(formatMoney(5)).toBe('£0.05');
  });

  it('groups thousands', () => {
    expect(formatMoney(120_500)).toBe('£1,205');
    expect(formatMoney(123_456_789)).toBe('£1,234,567.89');
  });

  it('knows its currencies, and falls back to the code rather than guessing a symbol', () => {
    expect(formatMoney(2_460, 'USD')).toBe('$24.60');
    expect(formatMoney(2_460, 'EUR')).toBe('€24.60');
    expect(formatMoney(2_460, 'PLN')).toBe('PLN 24.60');
  });

  it('does not invent minor units for currencies that have none', () => {
    // ¥1,200 is twelve hundred yen, not twelve. Dividing it by 100 would be a
    // hundredfold error in the one place this product cannot afford one.
    expect(formatMoney(1_200, 'JPY')).toBe('¥1,200');
  });

  it('carries a sign rather than dropping it', () => {
    expect(formatMoney(-2_460)).toBe('-£24.60');
  });
});

describe('weeklyShareMinor', () => {
  it('spreads a bill across the weeks between its payments', () => {
    // The figure the design is drawn against: £980 a month lands as £226 a week.
    expect(formatMoney(weeklyShareMinor(98_000, 'monthly'))).toBe('£226.15');
    expect(weeklyShareMinor(98_000, 'monthly')).toBe(22_615);
  });

  it('leaves a weekly bill alone', () => {
    expect(weeklyShareMinor(4_200, 'weekly')).toBe(4_200);
  });

  it('halves a fortnightly one and quarters nothing else by accident', () => {
    expect(weeklyShareMinor(4_200, 'fortnightly')).toBe(2_100);
    expect(weeklyShareMinor(52_000, 'quarterly')).toBe(4_000);
    expect(weeklyShareMinor(3_500, 'yearly')).toBe(67);
  });

  it('errs high rather than low', () => {
    // Fifty-two weeks, not the 52.18 a year really has. A week must never be told it
    // has more money than it does; being a little pessimistic is the safe direction,
    // and it is the arithmetic someone can check by hand.
    const trueWeeks = (98_000 * 12) / (365.25 / 7);
    expect(weeklyShareMinor(98_000, 'monthly')).toBeGreaterThan(trueWeeks);
  });
});

describe('weeklyBillsMinor', () => {
  it('is what every week owes before anything is spent', () => {
    const bills = [
      { amountMinor: 98_000, cadence: 'monthly' as const },
      { amountMinor: 4_200, cadence: 'monthly' as const },
      { amountMinor: 3_500, cadence: 'yearly' as const },
    ];
    expect(weeklyBillsMinor(bills)).toBe(22_615 + 969 + 67);
  });

  it('is nothing when there are no bills', () => {
    expect(weeklyBillsMinor([])).toBe(0);
  });
});

describe('money as a capacity unit', () => {
  it('reads the same bar the day reads', () => {
    // Committed is what has been spent, fixed is what the bills take, and the limit is
    // the week's. Only the unit changes — the arithmetic is the planner's.
    const c = capacity({ committed: 15_200, fixed: 27_900, limit: 60_000 });
    expect(remainingLabel(c, money())).toBe('£169 left');
    expect(c.isOver).toBe(false);
  });

  it('says over in money, and only when it is', () => {
    const c = capacity({ committed: 40_000, fixed: 27_900, limit: 60_000 });
    expect(c.isOver).toBe(true);
    expect(remainingLabel(c, money())).toBe('£79 over');
  });

  it('reads an untouched week as free rather than left', () => {
    const c = capacity({ committed: 0, fixed: 0, limit: 60_000 });
    expect(remainingLabel(c, money())).toBe('£600 free');
  });
});
