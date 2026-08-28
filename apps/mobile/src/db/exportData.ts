import { exportEnvelope, type ExportEnvelope } from '@moed/core';
import { eq } from 'drizzle-orm';

import { db } from './client';
import {
  bills,
  dayLimits,
  entitlements,
  foodLogs,
  healthSleep,
  healthSyncState,
  healthWeight,
  healthWorkouts,
  projects,
  records,
  recurrences,
  savedFoods,
  settings,
  spending,
  weighIns,
} from './schema';
import { currentUserId } from '@/lib/user';

/** Singular names, for the sentence on the screen. */
export const TABLE_NAMES: Record<string, string> = {
  records: 'record',
  recurrences: 'repeat rule',
  projects: 'project',
  dayLimits: 'day limit',
  bills: 'bill',
  spending: 'spend',
  settings: 'setting',
  entitlements: 'plan record',
  foodLogs: 'food log',
  savedFoods: 'saved food',
  weighIns: 'weigh-in',
  healthSleep: 'night of sleep',
  healthWorkouts: 'workout',
  healthWeight: 'weight reading',
  healthSyncState: 'sync marker',
};

/**
 * Read everything, unfiltered.
 *
 * No `isNull(deletedAt)` anywhere here, deliberately, and it is the one place in the
 * app that omits it. Deletion is soft, and an export is the user's whole record of
 * their own use — tidying the deleted rows out of it would be the erasure that
 * "nothing disappears" exists to prevent, performed in a file rather than on a screen.
 * Each row carries its own `deletedAt` and says what it is.
 */
export async function readEverything(exportedAt: number): Promise<ExportEnvelope> {
  const user = currentUserId();

  // Listed one at a time rather than looped over the schema. A new table should have to
  // be added here on purpose: exporting whatever happens to exist is how something
  // private ends up in a file someone emails to themselves. It is also the only shape
  // the types allow — these tables do not share one row type, and the health ones do
  // not have a `user_id` at all, because they never leave the device to need one.
  return exportEnvelope(
    {
      records: await db.select().from(records).where(eq(records.userId, user)),
      recurrences: await db.select().from(recurrences).where(eq(recurrences.userId, user)),
      projects: await db.select().from(projects).where(eq(projects.userId, user)),
      dayLimits: await db.select().from(dayLimits).where(eq(dayLimits.userId, user)),
      bills: await db.select().from(bills).where(eq(bills.userId, user)),
      spending: await db.select().from(spending).where(eq(spending.userId, user)),
      settings: await db.select().from(settings).where(eq(settings.userId, user)),
      entitlements: await db.select().from(entitlements).where(eq(entitlements.userId, user)),
      foodLogs: await db.select().from(foodLogs).where(eq(foodLogs.userId, user)),
      savedFoods: await db.select().from(savedFoods).where(eq(savedFoods.userId, user)),
      weighIns: await db.select().from(weighIns).where(eq(weighIns.userId, user)),
      healthSleep: await db.select().from(healthSleep),
      healthWorkouts: await db.select().from(healthWorkouts),
      healthWeight: await db.select().from(healthWeight),
      healthSyncState: await db.select().from(healthSyncState),
    },
    exportedAt,
  );
}
