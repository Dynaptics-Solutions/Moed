import {
  DEFAULT_WEEK_MONEY_LIMIT_MINOR,
  weeklyBillsMinor,
  weekBounds,
  type BillCadence,
} from '@moed/core';
import { and, asc, eq, gte, isNull, lt } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { useMemo } from 'react';

import { db } from './client';
import { bills, spending } from './schema';
import { setSetting, useNumberSetting } from './settings';
import { currentUserId } from '@/lib/user';

export type Bill = typeof bills.$inferSelect;
export type Spend = typeof spending.$inferSelect;

/** The one currency this account keeps its money in. Multi-currency is not a phase. */
export const CURRENCY = 'GBP';

const WEEK_LIMIT_KEY = 'weekMoneyLimitMinor';

/**
 * Money, per week.
 *
 * The shape mirrors the day deliberately: bills are the week's fixed load the way
 * appointments are the day's, spending is its committed load the way tasks are, and both
 * read through the same capacity bar. Anything here that has an equivalent in
 * `records.ts` or `dayLimits.ts` is meant to look like it.
 */

/** Every bill, oldest first so one does not move under the finger. */
export function useBills() {
  const userId = currentUserId();

  return useLiveQuery(
    db
      .select()
      .from(bills)
      .where(and(eq(bills.userId, userId), isNull(bills.deletedAt)))
      .orderBy(asc(bills.createdAt)),
    [userId],
  );
}

export function useBill(id: string | undefined) {
  const userId = currentUserId();

  const { data } = useLiveQuery(
    db
      .select()
      .from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.id, id ?? ''), isNull(bills.deletedAt)))
      .limit(1),
    [id, userId],
  );

  return id !== undefined ? data?.[0] : undefined;
}

/** What was spent in the week containing `date`, newest first. */
export function useWeekSpending(date: Date) {
  const userId = currentUserId();
  const { start, end } = weekBounds(date);

  return useLiveQuery(
    db
      .select()
      .from(spending)
      .where(
        and(
          eq(spending.userId, userId),
          isNull(spending.deletedAt),
          gte(spending.spentAt, start),
          lt(spending.spentAt, end),
        ),
      )
      .orderBy(asc(spending.spentAt)),
    [userId, start, end],
  );
}

/**
 * The week's money limit.
 *
 * Kept in `settings` rather than its own table because, unlike the day, there is one
 * figure and not one per week. When a week needs its own limit — a holiday, a quiet
 * month — that wants a table shaped like `day_limits`, and this becomes its default.
 */
export function useWeekMoneyLimit(): number {
  return useNumberSetting(WEEK_LIMIT_KEY, DEFAULT_WEEK_MONEY_LIMIT_MINOR);
}

/** £5 a step, and a range wide enough for a real week without a text field. */
export const WEEK_LIMIT_STEP_MINOR = 500;
export const WEEK_LIMIT_MIN_MINOR = 1_000;
export const WEEK_LIMIT_MAX_MINOR = 500_000;

export function setWeekMoneyLimit(minor: number): Promise<void> {
  const clamped = Math.min(WEEK_LIMIT_MAX_MINOR, Math.max(WEEK_LIMIT_MIN_MINOR, minor));
  return setSetting(WEEK_LIMIT_KEY, clamped);
}

/** What the bills take out of every week before anything is spent. */
export function useWeeklyBills(): number {
  const { data } = useBills();
  return useMemo(() => weeklyBillsMinor(data ?? []), [data]);
}

export type NewBill = {
  title: string;
  amountMinor: number;
  cadence: BillCadence;
  dueAt?: number | null;
  remindAt?: number | null;
};

export async function createBill(input: NewBill): Promise<Bill> {
  const now = Date.now();
  const row = {
    id: randomUUID(),
    userId: currentUserId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: true,
    syncedAt: null,
    title: input.title,
    amountMinor: input.amountMinor,
    currency: CURRENCY,
    cadence: input.cadence,
    dueAt: input.dueAt ?? null,
    remindAt: input.remindAt ?? null,
  };

  await db.insert(bills).values(row);
  return row;
}

export async function updateBill(id: string, input: Partial<NewBill>): Promise<void> {
  await db
    .update(bills)
    .set({ ...input, updatedAt: Date.now(), dirty: true })
    .where(eq(bills.id, id));
}

/** Soft, like every other delete here: a missing row is not the same as a deleted one. */
export async function deleteBill(id: string): Promise<void> {
  const now = Date.now();
  await db
    .update(bills)
    .set({ deletedAt: now, updatedAt: now, dirty: true })
    .where(eq(bills.id, id));
}

export async function logSpending(input: {
  title: string;
  amountMinor: number;
  spentAt?: number;
}): Promise<Spend> {
  const now = Date.now();
  const row = {
    id: randomUUID(),
    userId: currentUserId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: true,
    syncedAt: null,
    title: input.title,
    amountMinor: input.amountMinor,
    currency: CURRENCY,
    spentAt: input.spentAt ?? now,
    projectId: null,
  };

  await db.insert(spending).values(row);
  return row;
}
