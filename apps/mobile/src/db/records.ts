import { dayBounds, monthGridBounds, weekBounds } from '@moed/core';
import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { records, type RecordKind } from './schema';
import { currentUserId } from '@/lib/user';

// Re-exported so callers reach for one place; the arithmetic itself is core's, and tested.
export { dayBounds, weekBounds, monthGridBounds };

export type PlannerRecord = typeof records.$inferSelect;

/**
 * Every scheduled record between two instants, live. A write anywhere re-renders every
 * screen reading this table — the database is the state, so there is no store to keep
 * in step with it.
 *
 * Day, week and month all read through here. They are the same records seen at three
 * scales, and querying them three different ways is how the three views start
 * disagreeing about what a day holds.
 */
export function useRangeRecords(start: number, end: number) {
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

export function useDayRecords(date: Date) {
  const { start, end } = dayBounds(date);
  return useRangeRecords(start, end);
}

export type NewRecord = {
  kind: RecordKind;
  title: string;
  lengthMinutes?: number;
  startAt?: number | null;
  isFixed?: boolean;
  projectId?: string | null;
  notes?: string | null;
  /** Routine steps. One block, several steps -- it costs the day once, not six times. */
  steps?: string[] | null;
  /** Errand stops. One trip on the day, not three loose tasks. */
  stops?: string[] | null;
  recurrenceId?: string | null;
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
    recurrenceId: input.recurrenceId ?? null,
    remindAt: null,
    notes: input.notes ?? null,
    steps: input.steps ?? null,
    stops: input.stops ?? null,
    state: 'open' as const,
    slipCount: 0,
    /** No sitting under way and nothing fed yet — a session starts at zero like the rest. */
    timerStartedAt: null,
    timerSeconds: 0,
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
export async function moveRecord(id: string, toDayStart: number): Promise<number | null> {
  const [row] = await db.select().from(records).where(eq(records.id, id)).limit(1);
  if (!row) return null;

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

  // Where it was, so whoever proposed the move can offer one tap back. The gate
  // proposes and the person accepts, but accepting is still something the app did on
  // their behalf, and nothing the app does on their behalf is one-way.
  return row.startAt;
}

/**
 * Put a record's time back exactly as it was, including back to no time at all.
 *
 * This is the other half of `moveRecord`: it undoes, so it takes the value rather than
 * a day, and it does not touch the slip count — an undone move never happened, and a
 * slip it did not cause is not its to record.
 */
export async function setStartAt(id: string, startAt: number | null): Promise<void> {
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

/**
 * Move a record to the next day, counting the slip.
 *
 * The count is the point. A record that has slipped three times should be visible as
 * having slipped three times, rather than quietly rescheduled a fourth — that is what
 * the tray exists to prevent, and the number is a fact rather than a reprimand.
 */
export async function slipToNextDay(id: string, from: Date): Promise<void> {
  const [row] = await db.select().from(records).where(eq(records.id, id)).limit(1);
  if (!row) return;

  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  if (row.startAt !== null) {
    const was = new Date(row.startAt);
    to.setHours(was.getHours(), was.getMinutes(), 0, 0);
  } else {
    to.setHours(9, 0, 0, 0);
  }

  await db
    .update(records)
    .set({
      startAt: to.getTime(),
      slipCount: row.slipCount + 1,
      updatedAt: Date.now(),
      dirty: true,
    })
    .where(eq(records.id, id));
}

/**
 * Dropped, not deleted. It stays readable, exportable and countable in the day it was
 * dropped from — nothing disappears, and a decision to abandon something is part of the
 * record of the day rather than an erasure of it.
 */
export async function dropRecord(id: string): Promise<void> {
  await db
    .update(records)
    .set({ state: 'dropped', updatedAt: Date.now(), dirty: true })
    .where(eq(records.id, id));
}

/** Put a record back on a day, from the tray. The slip it already carries stays. */
export async function scheduleRecord(id: string, at: number): Promise<void> {
  await db
    .update(records)
    .set({ startAt: at, state: 'open', updatedAt: Date.now(), dirty: true })
    .where(eq(records.id, id));
}

/** One record, live. Returns undefined while the query is in flight or if it is gone. */
export function useRecord(id: string | undefined) {
  const userId = currentUserId();

  const { data } = useLiveQuery(
    db
      .select()
      .from(records)
      .where(and(eq(records.userId, userId), eq(records.id, id ?? ''), isNull(records.deletedAt)))
      .limit(1),
    [id, userId],
  );

  return id ? data?.[0] : undefined;
}

/**
 * Edit an existing record in place.
 *
 * Separate from `createRecord` on purpose: a form that reaches for one when it meant
 * the other silently duplicates the thing someone was trying to change, and the
 * duplicate looks exactly like a bug in the day view rather than in the form.
 */
export async function updateRecord(id: string, fields: Partial<NewRecord>): Promise<void> {
  await db
    .update(records)
    .set({
      ...(fields.title !== undefined && { title: fields.title }),
      ...(fields.lengthMinutes !== undefined && { lengthMinutes: fields.lengthMinutes }),
      ...(fields.startAt !== undefined && { startAt: fields.startAt }),
      ...(fields.isFixed !== undefined && { isFixed: fields.isFixed }),
      ...(fields.projectId !== undefined && { projectId: fields.projectId }),
      ...(fields.notes !== undefined && { notes: fields.notes }),
      ...(fields.steps !== undefined && { steps: fields.steps }),
      ...(fields.stops !== undefined && { stops: fields.stops }),
      ...(fields.recurrenceId !== undefined && { recurrenceId: fields.recurrenceId }),
      updatedAt: Date.now(),
      dirty: true,
    })
    .where(eq(records.id, id));
}
