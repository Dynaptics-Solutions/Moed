import { dayBounds, dayLoad, type DayCandidate } from '@moed/core';
import { useMemo } from 'react';

import { limitFor, useLimitsByDate } from './dayLimits';
import { useRangeRecords } from './records';
import { weekdayName } from '@/lib/day';

/**
 * The next few days and how much room each has — what the gate needs to be able to say
 * "Thursday is empty" rather than "move it to another day".
 *
 * Seven days because that is as far as a suggestion stays useful. Past a week, "move it
 * to next Tuesday" is not a fix, it is a way of losing something.
 */
export function useUpcomingDays(from: Date, count = 7): DayCandidate[] {
  const first = new Date(from);
  first.setHours(0, 0, 0, 0);
  first.setDate(first.getDate() + 1);

  const last = new Date(first);
  last.setDate(last.getDate() + count);

  const start = first.getTime();
  const end = last.getTime();

  const { data: rows } = useRangeRecords(start, end);
  const limits = useLimitsByDate();

  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const bounds = dayBounds(date);

        const onThisDay = (rows ?? []).filter(
          (r) => r.startAt !== null && r.startAt >= bounds.start && r.startAt < bounds.end,
        );
        const load = dayLoad(onThisDay);
        const planned = load.committed + load.fixed;

        return {
          date: bounds.start,
          free: Math.max(0, limitFor(limits, date) - planned),
          label: weekdayName(date),
          isEmpty: planned === 0,
        };
      }),
    [count, start, rows, limits],
  );
}
