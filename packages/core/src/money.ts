import type { Unit } from './format';

/**
 * Money, per week — the second budget, and the same bar as the first.
 *
 * Amounts are held in minor units everywhere: pence, cents. Never floats. A budget that
 * cannot be trusted to add up is worse than no budget, and 0.1 + 0.2 is the oldest way
 * to lose that trust.
 */

/** £600 a week, matching the figure the designs are drawn against. */
export const DEFAULT_WEEK_MONEY_LIMIT_MINOR = 60_000;

export type BillCadence = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';

/** How many times a year each cadence is paid. */
const PER_YEAR: Record<BillCadence, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

/**
 * What a bill costs one week.
 *
 * This is the whole idea of the money phase. A bill is to money what an appointment is
 * to time — dated, fixed, and it lowers the limit the moment it is added — but unlike an
 * appointment it lands on one day and would otherwise write that week off entirely.
 * Spreading it is what stops the week the rent leaves from looking like a disaster.
 *
 * Fifty-two weeks to the year, not the 52.18 a calendar actually has. Two reasons, and
 * the second is the one that matters: it is the arithmetic someone can check by hand
 * (980 × 12 ÷ 52), and it errs a fraction high, so a week is never told it has more
 * money than it does. This product refuses rather than flatters.
 */
export function weeklyShareMinor(amountMinor: number, cadence: BillCadence): number {
  return Math.round((amountMinor * PER_YEAR[cadence]) / 52);
}

/** What a set of bills takes out of every week, before anything is spent. */
export function weeklyBillsMinor(
  bills: readonly { amountMinor: number; cadence: BillCadence }[],
): number {
  return bills.reduce((sum, b) => sum + weeklyShareMinor(b.amountMinor, b.cadence), 0);
}

const SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  AUD: '$',
  CAD: '$',
  NZD: '$',
};

/** Currencies with no minor unit at all, where "1.00" would be a lie about precision. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK']);

/**
 * Money the way the designs write it: "£980", "£24.60", "£1,205".
 *
 * Whole amounts carry no decimals, for the same reason a whole number of hours carries
 * no trailing "0m" — nothing in this product writes a digit it does not mean. Which
 * means "£24.60" is exact and "£980" is exact, and neither is padded to look like the
 * other.
 *
 * Formatted here rather than through `Intl`, whose presence on Hermes depends on how the
 * engine was built. A number this product prints has to be the same number on every
 * device it runs on.
 */
export function formatMoney(minor: number, currency = 'GBP'): string {
  const code = currency.toUpperCase();
  const symbol = SYMBOLS[code] ?? '';
  const zeroDecimal = ZERO_DECIMAL.has(code);
  const scale = zeroDecimal ? 1 : 100;

  const negative = minor < 0;
  const abs = Math.round(Math.abs(minor));
  const whole = Math.floor(abs / scale);
  const part = abs % scale;

  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = part === 0 ? grouped : `${grouped}.${String(part).padStart(2, '0')}`;

  const prefix = symbol !== '' ? symbol : `${code} `;
  return `${negative ? '-' : ''}${prefix}${body}`;
}

/**
 * The money unit for the capacity bar.
 *
 * A factory rather than a constant, because unlike minutes a money figure cannot be
 * read without knowing which money it is.
 */
export function money(currency = 'GBP'): Unit {
  return { format: (value: number) => formatMoney(value, currency) };
}
