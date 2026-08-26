import { DEFAULT_DAY_LIMIT_MINUTES, dayLoad, type DayCandidate } from '@moed/core';
import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from './client';
import { isoDate } from './dayLimits';
import { dayBounds } from './records';
import { dayLimits, records } from './schema';
import { currentUserId } from '@/lib/user';
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
  const userId = currentUserId();

  const { data: rows } = useLiveQuery(
    db
      .select()
      .from(records)
      .where(
        and(
          eq(records.userId, userId),
          isNull(records.deletedAt),
          gte(records.startAt, start),
          lt(records.startAt, end),
        ),
      ),
    [start, end, userId],
  );

  const { data: limits } = useLiveQuery(
    db
      .select()
      .from(dayLimits)
      .where(and(eq(dayLimits.userId, userId), isNull(dayLimits.deletedAt))),
    [userId],
  );

  const limitByDate = new Map((limits ?? []).map((l) => [l.date, l.limitMinutes]));

  return Array.from({ length: count }, (_, i) => {
    const date = new Date(first);
    date.setDate(date.getDate() + i);
    const bounds = dayBounds(date);

    const onThisDay = (rows ?? []).filter(
      (r) => r.startAt !== null && r.startAt >= bounds.start && r.startAt < bounds.end,
    );
    const load = dayLoad(onThisDay);
    const limit = limitByDate.get(isoDate(date)) ?? DEFAULT_DAY_LIMIT_MINUTES;
    const planned = load.committed + load.fixed;

    return {
      date: bounds.start,
      free: Math.max(0, limit - planned),
      label: weekdayName(date),
      isEmpty: planned === 0,
    };
  });
}
