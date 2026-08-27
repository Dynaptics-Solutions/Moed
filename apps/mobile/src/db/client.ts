import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/**
 * The database is the state. There is no store layer over it and no cache in front of
 * it — the app reads and writes here, always, and the network reconciles afterwards.
 *
 * `enableChangeListener` is what makes `useLiveQuery` work: a write anywhere
 * re-renders every screen reading that table, which is the behaviour a local-first
 * app wants and the reason no separate state library is needed.
 */
const sqlite = openDatabaseSync('moed.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
export { schema, sqlite };
