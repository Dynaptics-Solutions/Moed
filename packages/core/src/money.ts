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
 * What someone typed into an amount field, reduced to what this product can mean by it.
 *
 * The inverse of `formatMoney`, and it lives beside it for the same reason that one is
 * not written through `Intl`: a number this product reads has to be the same number on
 * every device it runs on. The two money screens were each carrying their own copy of
 * this, which is how they came to share a bug.
 *
 * **A comma is a decimal point, not a thousands separator.** Android's `decimal-pad`
 * puts `,` and `.` side by side because it cannot know which glyph a locale writes for
 * the same thing, and it offers no grouping key at all — so a comma arriving from that
 * keyboard is someone typing a decimal point. The version this replaces stripped it and
 * kept the digits, which read "12,50" as £1,250: a hundredfold overcharge, typed on a
 * key the keyboard itself offered, shown back as "£12,50", and contradicted only by a
 * caption under the fold.
 *
 * The one comma that still groups is the one `formatMoney` writes: three digits and then
 * either another separator or the end, as in "1,205.65". That shape cannot be reached by
 * typing, because the field shows this function's own answer back — after the first
 * keystroke the comma is already a point, so a comma with three digits behind it only
 * ever arrives pasted or pre-filled. It costs a European typing "1,250" for £1.25, which
 * is three decimal digits of money and nobody's habit.
 *
 * The result is text and not a number, because it is what the field should show while
 * it is still being typed: a trailing point survives, so "12." can become "12.5".
 */
export function normaliseAmountText(text: string, currency = 'GBP'): string {
  const digits = text
    .replace(/[^0-9.,]/g, '')
    // Grouping, and only in the shape `formatMoney` writes it.
    .replace(/,(?=\d{3}(?:[.,]|$))/g, '')
    .replace(/,/g, '.');

  const point = digits.indexOf('.');
  if (point === -1) return digits;

  // A currency with no minor unit has nothing after the point to keep.
  if (ZERO_DECIMAL.has(currency.toUpperCase())) return digits.slice(0, point);

  // A number has one point. Everything from a second one is dropped rather than run
  // together with the first fraction, so "12.5.7" is £12.50 and never £12.57.
  const rest = digits.slice(point + 1);
  const second = rest.indexOf('.');
  const fraction = (second === -1 ? rest : rest.slice(0, second)).slice(0, 2);
  return `${digits.slice(0, point)}.${fraction}`;
}

/** The same text as minor units — pence, cents — which is the only form ever stored. */
export function moneyFromText(text: string, currency = 'GBP'): number {
  const normalised = normaliseAmountText(text, currency);
  const [whole = '', fraction = ''] = normalised.split('.');
  const pounds = Number(whole === '' ? '0' : whole);

  if (ZERO_DECIMAL.has(currency.toUpperCase())) return pounds;
  return pounds * 100 + Number(fraction.padEnd(2, '0'));
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
