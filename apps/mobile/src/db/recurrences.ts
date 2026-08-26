import type { Recurrence } from '@moed/core';
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
