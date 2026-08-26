/**
 * Date arithmetic, kept apart from date *formatting*.
 *
 * Everything here is pure and locale-free, which is why it lives in core: the server
 * needs the same week boundaries the phone uses, and getting ISO week numbering subtly
 * wrong is the kind of fault that hides until one particular week of one particular
 * year.
 *
 * Anything that reads a month name or a clock time belongs in the app, because it is
 * bound to a locale.
 */

export const DAY_MS = 86_400_000;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local midnight to local midnight. A day is the user's day, not UTC's. */
export function dayBounds(date: Date): { start: number; end: number } {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

/** Monday-first, because both the week grid and the month grid start there. */
export function weekBounds(date: Date): { start: number; end: number } {
  const start = startOfDay(date);
  // getDay() is 0 for Sunday; shift so Monday is 0.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start: start.getTime(), end: end.getTime() };
}

/** The whole grid a month is drawn on, including its leading and trailing days. */
export function monthGridBounds(date: Date): {
  start: number;
  end: number;
  firstOfMonth: Date;
} {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: weekBounds(firstOfMonth).start,
    end: weekBounds(lastOfMonth).end,
    firstOfMonth,
  };
}

/**
 * The ISO 8601 week number.
 *
 * Weeks start Monday and week 1 is the one containing the first Thursday of the year —
 * so this counts from a Thursday rather than from the date itself. That is what makes
 * 1 January fall in week 52 or 53 of the previous year when it lands on a Friday,
 * Saturday or Sunday, and it is the case a naive implementation gets wrong.
 */
export function isoWeek(date: Date): number {
  const thursday = startOfDay(date);
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7));

  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setHours(0, 0, 0, 0);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));

  // Both ends are Thursdays at local midnight, so a DST shift between them would
  // otherwise round the wrong way.
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}

/** The year the ISO week belongs to, which is not always the date's own year. */
export function isoWeekYear(date: Date): number {
  const thursday = startOfDay(date);
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7));
  return thursday.getFullYear();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

/** 0 for Monday through 6 for Sunday, which is the order both grids are drawn in. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}
