import { startOfDay } from '@moed/core';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from './client';
import { records } from './schema';
import { currentUserId } from '@/lib/user';

/**
 * The tray: everything that is still owed but is not on a day.
 *
 * It is derived rather than swept. A record whose day has passed and which is still
 * open *is* slipped — there is no nightly job that has to run for that to be true, and
 * no window in which a missed sweep would make a record vanish from both the day it
 * left and the tray it never reached.
 *
 * Two things land here:
 *
 *   - a record left open on a day that has gone. Nothing rolls silently into tomorrow,
 *     so it waits here rather than reappearing somewhere it was never put;
 *   - a record with no date at all, which is what `state: 'tray'` marks.
 *
 * Dropped records are not here. Dropping is a decision and it was taken; the tray is
 * for what has not been decided.
 */
export function useTrayRecords(today: Date) {
  const userId = currentUserId();
  const cutoff = startOfDay(today).getTime();

  return useLiveQuery(
    db
      .select()
      .from(records)
      .where(
        and(
          eq(records.userId, userId),
          isNull(records.deletedAt),
          or(
            and(eq(records.state, 'open'), lt(records.startAt, cutoff)),
            eq(records.state, 'tray'),
          ),
        ),
      )
      .orderBy(records.startAt),
    [cutoff, userId],
  );
}
