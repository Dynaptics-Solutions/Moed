/**
 * Date *formatting*. The arithmetic lives in `@moed/core` — it is pure, the server
 * needs the same answers, and ISO week numbering is worth having tests for. What is
 * here is bound to a locale and belongs on the client.
 */

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

/** "Tue" — the month peek's heading. */
export function weekdayShort(date: Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
}

/** "26 August" — the screen title, and the only place a date is set in Cormorant. */
export function dayTitle(date: Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date);
}

/** "9:30" — a clock time on a row. Never zero-padded on the hour. */
export function clockTime(date: Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
}

/** "Aug 25 — 31", collapsing the month when both ends share it. */
export function weekRangeLabel(start: Date, end: Date, locale = 'en-GB'): string {
  const month = (d: Date) => new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  const left = `${month(start)} ${start.getDate()}`;
  const right =
    start.getMonth() === end.getMonth() ? String(end.getDate()) : `${month(end)} ${end.getDate()}`;
  return `${left} — ${right}`;
}

/** "August" */
export function monthName(date: Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
}

/** Monday-first initials, as the week and month headers print them. */
export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
