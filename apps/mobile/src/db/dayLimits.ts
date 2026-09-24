import { DEFAULT_DAY_LIMIT_MINUTES } from '@moed/core';
import { and, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from './client';
import { dayLimits } from './schema';
import { setSetting, useNumberSetting } from './settings';
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

/** The key the user's own default day limit is stored under. */
export const DAY_LIMIT_KEY = 'dayLimitMinutes';

/** How far the day limit can be moved, and in what steps. */
export const DAY_LIMIT_STEP = 30;
export const DAY_LIMIT_MIN = 120;
export const DAY_LIMIT_MAX = 960;

/**
 * The user's own day limit, for every day they have not set one on.
 *
 * `DEFAULT_DAY_LIMIT_MINUTES` is the product's opening guess, not a rule. Nine and a
 * half hours is the number the designs are drawn with and it is nobody's actual day.
 */
export function useDefaultDayLimit(): number {
  return useNumberSetting(DAY_LIMIT_KEY, DEFAULT_DAY_LIMIT_MINUTES);
}

export function setDefaultDayLimit(minutes: number): Promise<void> {
  const clamped = Math.min(DAY_LIMIT_MAX, Math.max(DAY_LIMIT_MIN, minutes));
  return setSetting(DAY_LIMIT_KEY, clamped);
}

/**
 * One day's limit: what was set for that date, or the account's default.
 *
 * The default is passed in rather than read here so a screen holding many days —
 * the week, the month — reads it once instead of once per cell.
 */
export function limitFor(
  limits: Map<string, number>,
  date: Date,
  fallback: number = DEFAULT_DAY_LIMIT_MINUTES,
): number {
  return limits.get(isoDate(date)) ?? fallback;
}

/** A single day's limit in minutes. */
export function useDayLimit(date: Date): number {
  const limits = useLimitsByDate();
  const fallback = useDefaultDayLimit();
  return limitFor(limits, date, fallback);
}
