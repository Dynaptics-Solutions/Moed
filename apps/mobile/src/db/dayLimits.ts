import { DEFAULT_DAY_LIMIT_MINUTES } from '@moed/core';
import { and, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from './client';
import { dayLimits } from './schema';
import { currentUserId } from '@/lib/user';

/** yyyy-mm-dd in the user's own zone, which is the key `day_limits` is stored under. */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * A day's limit in minutes.
 *
 * A row exists only when the day differs from the default — a short night lowered it,
 * or the user set it. Absence means the default, so an untouched year of days costs no
 * storage and no sync traffic.
 */
export function useDayLimit(date: Date): number {
  const key = isoDate(date);
  const userId = currentUserId();

  const { data } = useLiveQuery(
    db
      .select()
      .from(dayLimits)
      .where(
        and(eq(dayLimits.userId, userId), eq(dayLimits.date, key), isNull(dayLimits.deletedAt)),
      ),
    [key, userId],
  );

  return data?.[0]?.limitMinutes ?? DEFAULT_DAY_LIMIT_MINUTES;
}
