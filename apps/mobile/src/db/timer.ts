import { eq } from 'drizzle-orm';

import { db } from './client';
import { records } from './schema';
import type { PlannerRecord } from './records';

/**
 * A session under way.
 *
 * The clock lives in the database rather than in React state, because a timer that only
 * counts while its screen is mounted is not a timer — it is an animation. Closing the
 * app, locking the phone or wandering off to the week view all have to leave the count
 * running, and all of them unmount this screen.
 *
 * So the row holds two numbers and the elapsed figure is derived: what earlier sittings
 * came to, plus how long the current one has been going. Nothing ticks; the screen
 * re-reads the clock once a second and does the subtraction.
 */

/** How long this session has been fed, in seconds, as of `now`. */
export function elapsedSeconds(
  record: Pick<PlannerRecord, 'timerStartedAt' | 'timerSeconds'>,
  now: number = Date.now(),
): number {
  const running = record.timerStartedAt !== null ? (now - record.timerStartedAt) / 1000 : 0;
  return Math.max(0, Math.round(record.timerSeconds + running));
}

export function isRunning(record: Pick<PlannerRecord, 'timerStartedAt'>): boolean {
  return record.timerStartedAt !== null;
}

/** Begin a sitting. Starting an already-running session is a no-op, not a restart. */
export async function startTimer(id: string): Promise<void> {
  const now = Date.now();
  const [row] = await db.select().from(records).where(eq(records.id, id)).limit(1);
  if (row === undefined || row.timerStartedAt !== null) return;

  await db
    .update(records)
    .set({ timerStartedAt: now, updatedAt: now, dirty: true })
    .where(eq(records.id, id));
}

/**
 * End the sitting and bank what it came to.
 *
 * Used by both Pause and Done, because they are the same write. The difference is only
 * where the person goes next, and a session is never marked finished by either: it
 * cannot be finished, only fed.
 */
export async function stopTimer(id: string): Promise<void> {
  const now = Date.now();
  const [row] = await db.select().from(records).where(eq(records.id, id)).limit(1);
  if (row === undefined || row.timerStartedAt === null) return;

  await db
    .update(records)
    .set({
      timerSeconds: elapsedSeconds(row, now),
      timerStartedAt: null,
      updatedAt: now,
      dirty: true,
    })
    .where(eq(records.id, id));
}
