import type { Recurrence } from '@moed/core';
import { and, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { recurrences } from './schema';
import { currentUserId } from '@/lib/user';

/**
 * A recurrence is its own row, referenced by the records that follow it, so editing the
 * rule later changes every occurrence rather than only the one in front of you.
 */
export async function createRecurrence(rule: Recurrence): Promise<string> {
  const now = Date.now();
  const id = randomUUID();

  await db.insert(recurrences).values({
    id,
    userId: currentUserId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: true,
    syncedAt: null,
    freq: rule.freq,
    interval: rule.interval,
    byWeekday: rule.byWeekday ?? null,
    ends: rule.ends,
    endsOn: rule.endsOn ?? null,
    endsAfter: rule.endsAfter ?? null,
  });

  return id;
}

/** One rule, live, for the detail sheet to read back as a sentence. */
export function useRecurrence(id: string | null | undefined): Recurrence | null {
  const userId = currentUserId();

  const { data } = useLiveQuery(
    db
      .select()
      .from(recurrences)
      .where(
        and(
          eq(recurrences.userId, userId),
          eq(recurrences.id, id ?? ''),
          isNull(recurrences.deletedAt),
        ),
      )
      .limit(1),
    [id, userId],
  );

  const row = id ? data?.[0] : undefined;
  if (!row) return null;

  return {
    freq: row.freq,
    interval: row.interval,
    byWeekday: row.byWeekday ?? [],
    ends: row.ends,
    endsOn: row.endsOn ?? undefined,
    endsAfter: row.endsAfter ?? undefined,
  };
}
