/**
 * Grouping a day into Morning, Afternoon and Evening.
 *
 * The boundaries are not settled anywhere in the design package — the mockups show
 * 9:30 and 10:00 under Morning and 14:00 under Afternoon, and no evening example at
 * all. Noon and 17:00 are the plain reading, and they are here rather than inline so
 * that changing them is one edit rather than a search.
 */
export const PARTS = ['Morning', 'Afternoon', 'Evening'] as const;
export type DayPart = (typeof PARTS)[number];

const AFTERNOON_FROM = 12;
const EVENING_FROM = 17;

export function dayPart(date: Date): DayPart {
  const hour = date.getHours();
  if (hour < AFTERNOON_FROM) return 'Morning';
  if (hour < EVENING_FROM) return 'Afternoon';
  return 'Evening';
}

/** "Tuesday" */
export function weekdayName(date: Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
}

/** "26 August" — the screen title, and the only place a date is set in Cormorant. */
export function dayTitle(date: Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date);
}

/** "9:30" — a clock time on a row. Never zero-padded on the hour. */
export function clockTime(date: Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
}
