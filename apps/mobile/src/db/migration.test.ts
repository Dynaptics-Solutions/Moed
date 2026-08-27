import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { syncedTables } from './schema';

/**
 * The generated migration, applied to a real SQLite database.
 *
 * This is the check that the app can start. `expo export` proves every import
 * resolves and the bundle is well-formed; it says nothing about whether the SQL
 * drizzle-kit emitted is valid or whether the schema it produces is the one the code
 * expects. A migration that fails does so on device, on first launch, after everything
 * else has already been built on the assumption that it worked.
 *
 * Node ships SQLite, so this runs anywhere — no emulator, no device, no Android SDK.
 * It is not expo-sqlite, and it does not pretend to be: what it verifies is the SQL and
 * the shape, which is where the risk is.
 */

const DRIZZLE = join(__dirname, '..', '..', 'drizzle');

function applyMigrations(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  const files = readdirSync(DRIZZLE)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  expect(files.length, 'no migrations found — run pnpm db:generate').toBeGreaterThan(0);

  for (const file of files) {
    const sql = readFileSync(join(DRIZZLE, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed !== '') db.exec(trimmed);
    }
  }

  return db;
}

const tableNames = (db: DatabaseSync) =>
  (
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[]
  ).map((r) => r.name);

const columnNames = (db: DatabaseSync, table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name);

const SYNC_COLUMNS = [
  'id',
  'user_id',
  'created_at',
  'updated_at',
  'deleted_at',
  '_dirty',
  '_synced_at',
];

const HEALTH_TABLES = ['health_sleep', 'health_workouts', 'health_weight', 'health_sync_state'];

describe('the migration', () => {
  it('applies cleanly to a real database', () => {
    expect(() => applyMigrations()).not.toThrow();
  });

  it('creates every table the app queries', () => {
    const names = tableNames(applyMigrations());

    for (const table of [...Object.values(syncedTables).map((t) => sqlName(t)), ...HEALTH_TABLES]) {
      expect(names, `missing ${table}`).toContain(table);
    }
  });

  it('gives every synced table all seven sync columns', () => {
    const db = applyMigrations();

    for (const table of Object.values(syncedTables).map((t) => sqlName(t))) {
      const columns = columnNames(db, table);
      for (const required of SYNC_COLUMNS) {
        expect(columns, `${table} is missing ${required}`).toContain(required);
      }
    }
  });

  it('gives the health tables no sync columns at all', () => {
    // The rule this enforces is structural rather than remembered: health data cannot
    // leave the device because there is nowhere in these rows for a sync cursor to go.
    // A future migration that quietly adds user_id to one of them fails here.
    const db = applyMigrations();

    for (const table of HEALTH_TABLES) {
      const columns = columnNames(db, table);
      for (const forbidden of ['user_id', 'deleted_at', '_dirty', '_synced_at']) {
        expect(columns, `${table} must not carry ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('accepts a record with the columns the app writes', () => {
    // A smoke test of the insert `createRecord` performs, so a column rename in the
    // schema that the writer did not follow fails here rather than on a device.
    const db = applyMigrations();

    expect(() =>
      db
        .prepare(
          `INSERT INTO records
             (id, user_id, created_at, updated_at, deleted_at, _dirty, _synced_at,
              kind, title, length_minutes, start_at, is_fixed, project_id, recurrence_id,
              remind_at, notes, steps, stops, state, slip_count)
           VALUES (?, ?, ?, ?, NULL, 1, NULL, 'task', 'Rewrite the onboarding copy', 120,
                   ?, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'open', 0)`,
        )
        .run('r1', 'u1', 1, 1, 1),
    ).not.toThrow();

    const row = db.prepare('SELECT title, length_minutes FROM records WHERE id = ?').get('r1') as {
      title: string;
      length_minutes: number;
    };
    expect(row.title).toBe('Rewrite the onboarding copy');
    expect(row.length_minutes).toBe(120);
  });

  it('keeps the unique indexes the schema declares', () => {
    const db = applyMigrations();
    const indexes = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as { name: string }[]
    ).map((r) => r.name);

    expect(indexes).toContain('day_limits_user_date');
    expect(indexes).toContain('settings_user_key');
  });
});

/** Drizzle keeps the SQL name on a symbol; this is the documented way to read it. */
function sqlName(table: unknown): string {
  const symbols = Object.getOwnPropertySymbols(table as object);
  const nameSymbol = symbols.find((s) => s.toString().includes('Name'));
  return String((table as Record<symbol, unknown>)[nameSymbol!]);
}
