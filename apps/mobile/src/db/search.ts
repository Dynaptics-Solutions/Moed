import { historyWindowDays, startOfDay, type Plan } from '@moed/core';
import { and, eq, gte, isNull, like, or } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from './client';
import { projects, records } from './schema';
import { currentUserId } from '@/lib/user';

/**
 * Search across records and projects.
 *
 * The free tier searches the last thirty days. Older records are not deleted and not
 * hidden from the day they live on — they are simply outside what search returns, which
 * is a different thing and the honest one. The screen says which it is doing.
 */
export function useSearch(query: string, plan: Plan, today: Date) {
  const userId = currentUserId();
  const trimmed = query.trim();
  const pattern = `%${trimmed}%`;

  const days = historyWindowDays(plan);
  const since = Number.isFinite(days)
    ? startOfDay(new Date(today.getTime() - days * 86_400_000)).getTime()
    : 0;

  const recordResults = useLiveQuery(
    db
      .select()
      .from(records)
      .where(
        and(
          eq(records.userId, userId),
          isNull(records.deletedAt),
          like(records.title, pattern),
          // An unscheduled record has no date to fall outside the window.
          or(isNull(records.startAt), gte(records.startAt, since)),
        ),
      )
      .orderBy(records.startAt),
    [userId, pattern, since],
  );

  const projectResults = useLiveQuery(
    db
      .select()
      .from(projects)
      .where(
        and(eq(projects.userId, userId), isNull(projects.deletedAt), like(projects.name, pattern)),
      ),
    [userId, pattern],
  );

  return {
    records: trimmed === '' ? [] : (recordResults.data ?? []),
    projects: trimmed === '' ? [] : (projectResults.data ?? []),
    /** True when the window is what is limiting the answer, so the screen can say so. */
    windowed: Number.isFinite(days),
  };
}
