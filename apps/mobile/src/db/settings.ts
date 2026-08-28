import { and, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { settings } from './schema';
import { currentUserId } from '@/lib/user';

/**
 * The flat key/value settings table, read and written in one place.
 *
 * Values are JSON so a setting can grow without a migration, and absence is always the
 * default rather than a row written at first run — an untouched account stores nothing
 * and syncs nothing.
 */

/** One number, live. Anything else stored under the key reads as the default. */
export function useNumberSetting(key: string, fallback: number): number {
  const userId = currentUserId();

  const { data } = useLiveQuery(
    db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, key), isNull(settings.deletedAt)))
      .limit(1),
    [userId, key],
  );

  const stored = data?.[0]?.value;
  return typeof stored === 'number' ? stored : fallback;
}

/** One string, live. Anything else stored under the key reads as the default. */
export function useStringSetting(key: string, fallback: string): string {
  const userId = currentUserId();

  const { data } = useLiveQuery(
    db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, key), isNull(settings.deletedAt)))
      .limit(1),
    [userId, key],
  );

  const stored = data?.[0]?.value;
  return typeof stored === 'string' ? stored : fallback;
}

/** One flag, live. Stored as a boolean; anything else under the key reads as the default. */
export function useBooleanSetting(key: string, fallback: boolean): boolean {
  const userId = currentUserId();

  const { data } = useLiveQuery(
    db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, key), isNull(settings.deletedAt)))
      .limit(1),
    [userId, key],
  );

  const stored = data?.[0]?.value;
  return typeof stored === 'boolean' ? stored : fallback;
}

/**
 * Write a setting, creating the row the first time.
 *
 * An upsert rather than an insert-or-update pair: the table has a unique index on
 * (user, key), and doing it in two statements is how the same key ends up written
 * twice by two screens saving at once.
 */
export async function setSetting(key: string, value: unknown): Promise<void> {
  const now = Date.now();

  await db
    .insert(settings)
    .values({
      id: randomUUID(),
      userId: currentUserId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dirty: true,
      syncedAt: null,
      key,
      value,
    })
    .onConflictDoUpdate({
      target: [settings.userId, settings.key],
      set: { value, updatedAt: now, dirty: true, deletedAt: null },
    });
}
