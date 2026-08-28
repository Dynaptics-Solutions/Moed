import { mondayIndex, startOfDay } from './dates';
import { formatMinutes } from './format';

/**
 * Recurrence, and the plain-language sentence the editor prints back.
 *
 * The sentence is the whole point of the screen. A frequency, an interval and a set of
 * weekday chips are three controls nobody reads as a rule; "Every 2 weeks on Mon, Wed
 * and Fri, until 12 December" is the rule, and it is what tells someone they have set
 * the wrong thing before they save it.
 *
 * The second line is the one the product exists for: "26 more of these. Each one costs
 * its day 40 minutes." A repeat is not one commitment, it is twenty-six, and a planner
 * that counts hours has to say so at the moment it is created.
 */

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Ends = 'never' | 'onDate' | 'afterN';

export type Recurrence = {
  freq: Frequency;
  /** Every N days/weeks/months/years. */
  interval: number;
  /** 0 = Sunday … 6 = Saturday. Weekly only; empty means the start date's own weekday. */
  byWeekday?: number[];
  ends: Ends;
  /** Epoch ms, when `ends` is 'onDate'. */
  endsOn?: number;
  /** Occurrence count, when `ends` is 'afterN'. */
  endsAfter?: number;
};

/**
 * Names come from outside so this stays locale-free and testable. The app passes Intl;
 * the tests pass fixed strings.
 */
export type RecurrenceLabels = {
  /** 0 = Sunday. "Mon", "Tue". */
  weekdayShort(index: number): string;
  /** "12 December". */
  date(ms: number): string;
};

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAYS = [1, 2, 3, 4, 5];

const sortWeekdays = (days: readonly number[]) =>
  [...new Set(days)].sort((a, b) => MONDAY_FIRST.indexOf(a) - MONDAY_FIRST.indexOf(b));

const sameSet = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

/** "Mon, Wed and Fri" — an Oxford-comma-free list, as the design writes it. */
export function joinWords(words: readonly string[]): string {
  if (words.length === 0) return '';
  if (words.length === 1) return words[0]!;
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]!}`;
}

const every = (interval: number, unit: string) =>
  interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;

/**
 * The sentence. Capitalised, and without a full stop — the caller adds one, because
 * this also has to read inside a row that already ends in an arrow.
 */
export function describeRecurrence(
  recurrence: Recurrence | null,
  labels: RecurrenceLabels,
): string {
  if (!recurrence) return 'Does not repeat';

  const { freq, interval, byWeekday, ends, endsOn, endsAfter } = recurrence;
  let head: string;

  if (freq === 'weekly') {
    const days = sortWeekdays(byWeekday ?? []);
    if (interval === 1 && sameSet(days, WEEKDAYS)) {
      head = 'Every weekday';
    } else if (days.length === 0) {
      head = every(interval, 'week');
    } else {
      head = `${every(interval, 'week')} on ${joinWords(days.map(labels.weekdayShort))}`;
    }
  } else {
    head = every(interval, freq === 'daily' ? 'day' : freq === 'monthly' ? 'month' : 'year');
  }

  if (ends === 'onDate' && endsOn !== undefined) return `${head}, until ${labels.date(endsOn)}`;
  if (ends === 'afterN' && endsAfter !== undefined) {
    return `${head}, ${endsAfter} time${endsAfter === 1 ? '' : 's'}`;
  }
  return head;
}

/** The dates a recurrence lands on, from `from` forward. Bounded, always. */
export function occurrences(recurrence: Recurrence, from: Date, cap = 500): Date[] {
  const out: Date[] = [];
  const start = startOfDay(from);
  const limit = recurrence.ends === 'afterN' ? Math.min(recurrence.endsAfter ?? 0, cap) : cap;
  const until = recurrence.ends === 'onDate' ? recurrence.endsOn : undefined;

  if (recurrence.freq === 'weekly') {
    const days = sortWeekdays(recurrence.byWeekday ?? [start.getDay()]);
    // Walk whole weeks from the Monday of the start week, so an interval of 2 skips
    // alternate weeks rather than alternate matching days.
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - mondayIndex(start));

    for (let week = 0; out.length < limit; week += recurrence.interval) {
      const base = new Date(weekStart);
      base.setDate(base.getDate() + week * 7);
      if (week > cap * 7) break;

      for (const day of days) {
        const d = new Date(base);
        d.setDate(d.getDate() + MONDAY_FIRST.indexOf(day));
        if (d.getTime() < start.getTime()) continue;
        if (until !== undefined && d.getTime() > until) return out;
        if (out.length >= limit) return out;
        out.push(d);
      }
    }
    return out;
  }

  const step = (d: Date, n: number) => {
    const next = new Date(d);
    if (recurrence.freq === 'daily') next.setDate(next.getDate() + n);
    else if (recurrence.freq === 'monthly') next.setMonth(next.getMonth() + n);
    else next.setFullYear(next.getFullYear() + n);
    return next;
  };

  let cursor = new Date(start);
  while (out.length < limit) {
    if (until !== undefined && cursor.getTime() > until) break;
    out.push(new Date(cursor));
    cursor = step(cursor, recurrence.interval);
  }
  return out;
}

/**
 * How many more of these there are, and null when it never ends.
 *
 * Null rather than a big number on purpose: "Every day, forever" is a different kind of
 * commitment from "26 more of these", and rounding the first into the second by
 * printing the cap would be a lie in the one place the product is counting.
 */
export function remainingOccurrences(recurrence: Recurrence, from: Date): number | null {
  if (recurrence.ends === 'never') return null;
  if (recurrence.ends === 'afterN') return Math.max(0, (recurrence.endsAfter ?? 0) - 1);
  // The first one is the record being created; the rest are what it commits to.
  return Math.max(0, occurrences(recurrence, from).length - 1);
}

/**
 * "26 more of these. Each one costs its day 40 minutes."
 *
 * Returns null when there is nothing worth saying — a rule that never ends has no
 * count, and a record with no length costs its day nothing.
 */
export function recurrenceCost(
  recurrence: Recurrence | null,
  from: Date,
  lengthMinutes: number,
): string | null {
  if (!recurrence) return null;

  const cost = lengthMinutes > 0 ? ` Each one costs its day ${formatMinutes(lengthMinutes)}.` : '';
  const remaining = remainingOccurrences(recurrence, from);

  if (remaining === null) {
    return lengthMinutes > 0 ? `This does not end.${cost}` : 'This does not end.';
  }
  if (remaining === 0) return null;

  return `${remaining} more of these.${cost}`;
}

/**
 * A year. How far ahead a rule that never ends is laid out.
 *
 * Bounded because "forever" is not a number of days. Long enough that nobody reaches
 * the edge in normal use, short enough that a daily rule is 365 dates rather than an
 * unbounded write.
 */
export const RECURRENCE_HORIZON_DAYS = 365;

/**
 * The dates a rule lands on *after* the one it starts from, within the horizon.
 *
 * The seed record already occupies the first occurrence, so this is what is still owed:
 * the twenty-six the repeat editor promises, or a year of a rule that never ends.
 *
 * Each date is that day's midnight. The caller puts the time of day back, because the
 * time belongs to the record rather than to the rule.
 */
export function followingOccurrences(
  recurrence: Recurrence,
  from: Date,
  horizonDays = RECURRENCE_HORIZON_DAYS,
): Date[] {
  const first = startOfDay(from).getTime();

  const horizon = startOfDay(from);
  horizon.setDate(horizon.getDate() + horizonDays);

  return occurrences(recurrence, from).filter(
    (d) => d.getTime() > first && d.getTime() <= horizon.getTime(),
  );
}
