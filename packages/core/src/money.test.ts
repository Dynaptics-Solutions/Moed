import { describe, expect, it } from 'vitest';

import { capacity } from './capacity';
import { remainingLabel } from './format';
import {
  formatMoney,
  money,
  moneyFromText,
  normaliseAmountText,
  weeklyBillsMinor,
  weeklyShareMinor,
} from './money';

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

describe('reading an amount someone typed', () => {
  it('reads a decimal comma as a decimal point', () => {
    // The fault this function exists for. Android's `decimal-pad` offers `,` and `.`
    // side by side; the screens stripped the comma and kept the digits, so a £12.50
    // lunch typed on the comma key became £1,250 — a hundredfold overcharge, shown
    // back as "£12,50" and contradicted only by a caption below the fold.
    expect(moneyFromText('12,50')).toBe(1_250);
    expect(moneyFromText('12.50')).toBe(1_250);
    expect(normaliseAmountText('12,50')).toBe('12.50');
  });

  it('still reads the one comma that groups', () => {
    // Three digits and then a separator or the end is the shape `formatMoney` writes,
    // and the only shape a grouping comma ever arrives in — pasted off a statement or
    // pre-filled, never typed, because the field shows the normalised text back.
    expect(moneyFromText('1,250')).toBe(125_000);
    expect(moneyFromText('1,205.65')).toBe(120_565);
    expect(moneyFromText('1,234,567.89')).toBe(123_456_789);
  });

  it('normalises a comma the moment it is typed, so grouping never reassembles', () => {
    // The keystroke path, which is the one that matters: a comma is a point before the
    // next digit arrives, so "12,5" is already "12.5" and the third digit lands on a
    // fraction rather than turning the pair into a thousand.
    expect(normaliseAmountText('12,')).toBe('12.');
    expect(normaliseAmountText('12,5')).toBe('12.5');
    expect(normaliseAmountText('12.50')).toBe('12.50');
  });

  it('keeps a number to one point', () => {
    // Dropped rather than run together: "12.5.7" is £12.50, and never £12.57.
    expect(moneyFromText('12.5.7')).toBe(1_250);
    expect(normaliseAmountText('12.5.7')).toBe('12.5');
  });

  it('pads a single decimal digit rather than reading it as pence', () => {
    expect(moneyFromText('12.5')).toBe(1_250);
    expect(moneyFromText('12.05')).toBe(1_205);
  });

  it('lets a half-typed amount stay half-typed', () => {
    // Normalising runs on every keystroke, so it has to survive the states a field
    // passes through on the way to a number.
    expect(normaliseAmountText('12.')).toBe('12.');
    expect(normaliseAmountText('')).toBe('');
    expect(moneyFromText('')).toBe(0);
    expect(moneyFromText('.')).toBe(0);
  });

  it('ignores everything that is not a digit or a point', () => {
    expect(moneyFromText('£12.50')).toBe(1_250);
    expect(moneyFromText('12 50')).toBe(125_000);
  });

  it('reads a currency with no minor unit as whole units', () => {
    // `formatMoney` already refuses to write "1.00" for yen; reading has to agree.
    expect(moneyFromText('1250', 'JPY')).toBe(1_250);
    expect(moneyFromText('12.50', 'JPY')).toBe(12);
    expect(normaliseAmountText('12.50', 'JPY')).toBe('12');
  });

  it('round-trips through formatMoney', () => {
    for (const minor of [0, 5, 125, 1_250, 98_000, 120_565]) {
      expect(moneyFromText(formatMoney(minor))).toBe(minor);
    }
  });
});
