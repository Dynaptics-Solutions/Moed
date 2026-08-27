import { and, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { projects, records } from './schema';
import { currentUserId } from '@/lib/user';

export type Project = typeof projects.$inferSelect;

/** Live, and ordered oldest first so a project does not move under the finger. */
export function useProjects() {
  const userId = currentUserId();

  return useLiveQuery(
    db
      .select()
      .from(projects)
      .where(
        and(eq(projects.userId, userId), isNull(projects.deletedAt), isNull(projects.archivedAt)),
      )
      .orderBy(projects.createdAt),
    [userId],
  );
}

/** Every record belonging to any project, so the list can show each one's progress. */
export function useProjectRecords() {
  const userId = currentUserId();

  return useLiveQuery(
    db
      .select()
      .from(records)
      .where(and(eq(records.userId, userId), isNull(records.deletedAt)))
      .orderBy(records.startAt),
    [userId],
  );
}

export async function createProject(name: string, colour?: string): Promise<Project> {
  const now = Date.now();
  const row = {
    id: randomUUID(),
    userId: currentUserId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: true,
    syncedAt: null,
    name,
    colour: colour ?? null,
    dueAt: null,
    budgetMinor: null,
    currency: null,
    archivedAt: null,
  };

  await db.insert(projects).values(row);
  return row;
}
