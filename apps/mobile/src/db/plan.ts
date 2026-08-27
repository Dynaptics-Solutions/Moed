import type { Plan } from '@moed/core';
import { and, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from './client';
import { entitlements } from './schema';
import { currentUserId } from '@/lib/user';

/**
 * The current plan, cached locally so entitlement survives offline.
 *
 * The server is the authority, but a plane with no signal is not a reason to lock
 * someone out of their own planner. Absence of a row means free — the honest default
 * for an account that has never subscribed.
 */
export function usePlan(): Plan {
  const userId = currentUserId();

  const { data } = useLiveQuery(
    db
      .select()
      .from(entitlements)
      .where(and(eq(entitlements.userId, userId), isNull(entitlements.deletedAt))),
    [userId],
  );

  return data?.[0]?.state ?? 'free';
}
