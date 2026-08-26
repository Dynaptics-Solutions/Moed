import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { records, type RecordKind } from './schema';
import { currentUserId } from '@/lib/user';

export type PlannerRecord = typeof records.$inferSelect;

/** Local midnight to local midnight. A day is the user's day, not UTC's. */
export function dayBounds(date: Date): { start: number; end: number } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

/**
 * The day's records, live. A write anywhere re-renders every screen reading this table
 * — the database is the state, so there is no store to keep in step with it.
 */
export function useDayRecords(date: Date) {
  const { start, end } = dayBounds(date);
  const userId = currentUserId();

  return useLiveQuery(
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
      )
      .orderBy(records.startAt),
    [start, end, userId],
  );
}

export type NewRecord = {
  kind: RecordKind;
  title: string;
  lengthMinutes?: number;
  startAt?: number | null;
  isFixed?: boolean;
  projectId?: string | null;
  notes?: string | null;
};

/**
 * Every write sets `updatedAt` and marks the row dirty. Nothing else is allowed to
 * touch this table, so there is one place where a row can be written without being
 * queued for the next push.
 */
export async function createRecord(input: NewRecord): Promise<PlannerRecord> {
  const now = Date.now();
  const row = {
    id: randomUUID(),
    userId: currentUserId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: true,
    syncedAt: null,
    kind: input.kind,
    title: input.title,
    lengthMinutes: input.lengthMinutes ?? 0,
    startAt: input.startAt ?? null,
    isFixed: input.isFixed ?? false,
    projectId: input.projectId ?? null,
    recurrenceId: null,
    remindAt: null,
    notes: input.notes ?? null,
    steps: null,
    stops: null,
    state: 'open' as const,
    slipCount: 0,
  };

  await db.insert(records).values(row);
  return row;
}

/**
 * Move a record to another day, keeping its time of day.
 *
 * Move carries everything — the record takes its length, reminder and project with it,
 * and nothing else on either day shifts. That is the whole behaviour: no cascade, no
 * repacking, no cleverness.
 */
export async function moveRecord(id: string, toDayStart: number): Promise<void> {
  const [row] = await db.select().from(records).where(eq(records.id, id)).limit(1);
  if (!row) return;

  let startAt = toDayStart;
  if (row.startAt !== null) {
    const was = new Date(row.startAt);
    const to = new Date(toDayStart);
    to.setHours(was.getHours(), was.getMinutes(), 0, 0);
    startAt = to.getTime();
  }

  await db
    .update(records)
    .set({ startAt, updatedAt: Date.now(), dirty: true })
    .where(eq(records.id, id));
}

export async function setDone(id: string, done: boolean): Promise<void> {
  await db
    .update(records)
    .set({ state: done ? 'done' : 'open', updatedAt: Date.now(), dirty: true })
    .where(eq(records.id, id));
}

/**
 * Soft, always. A hard delete breaks sync — a missing row is indistinguishable from a
 * row the device has not seen yet — and nothing disappears is a product rule, not an
 * implementation detail.
 */
export async function deleteRecord(id: string): Promise<void> {
  const now = Date.now();
  await db
    .update(records)
    .set({ deletedAt: now, updatedAt: now, dirty: true })
    .where(eq(records.id, id));
}
