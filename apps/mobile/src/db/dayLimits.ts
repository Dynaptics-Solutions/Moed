import { DEFAULT_DAY_LIMIT_MINUTES } from '@moed/core';
import { and, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

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
 * Every day whose limit differs from the default, keyed by date.
 *
 * A row exists only when something moved the limit — a short night lowered it, or the
 * user set it. Absence means the default, so an untouched year of days costs no storage
 * and no sync traffic. The whole table is read at once because it is tiny by
 * construction, and because the week and month views each need many days of it.
 */
export function useLimitsByDate(): Map<string, number> {
  const userId = currentUserId();

  const { data } = useLiveQuery(
    db
      .select()
      .from(dayLimits)
      .where(and(eq(dayLimits.userId, userId), isNull(dayLimits.deletedAt))),
    [userId],
  );

  return useMemo(() => new Map((data ?? []).map((l) => [l.date, l.limitMinutes])), [data]);
}

export function limitFor(limits: Map<string, number>, date: Date): number {
  return limits.get(isoDate(date)) ?? DEFAULT_DAY_LIMIT_MINUTES;
}

/** A single day's limit in minutes. */
export function useDayLimit(date: Date): number {
  const limits = useLimitsByDate();
  return limitFor(limits, date);
}
