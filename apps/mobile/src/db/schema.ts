import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * The local SQLite schema. The phone is the working copy — this is where the app
 * reads and writes, always, and the network reconciles afterwards.
 *
 * Every synced table carries the same seven columns. They exist from day one because
 * retrofitting them onto a populated database is far worse than carrying them before
 * sync is written.
 *
 *   id          client-generated UUID, so offline creates never collide
 *   user_id     present from record zero, never nullable — accounts are mandatory
 *   created_at  epoch ms
 *   updated_at  epoch ms, server-comparable; last-write-wins compares this
 *   deleted_at  soft delete
 *   _dirty      local-only, never sent
 *   _synced_at  local-only, never sent
 *
 * Soft deletes are mandatory for two independent reasons: a hard delete breaks sync
 * (a missing row is indistinguishable from a row you have not seen yet), and
 * "nothing disappears" is a product non-negotiable.
 */
const syncColumns = {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  /** A row is dirty the moment it is written locally, and clean only after a push. */
  dirty: integer('_dirty', { mode: 'boolean' }).notNull().default(true),
  syncedAt: integer('_synced_at'),
};

// ---------------------------------------------------------------- planner

/**
 * The five *time* kinds. Bill and spending are record kinds in the product's type
 * picker — seven forms — but they spend money rather than hours, so they live in
 * their own tables below. The entitlement table draws the same line: time kinds are
 * unlimited on free, bills are capped at five.
 *
 * Meal is not a kind. A cook block is a Routine and spends hours; the food is a log
 * and spends calories. Each budget is spent by the thing that actually spends it.
 */
export const RECORD_KINDS = ['task', 'routine', 'session', 'errand', 'appointment'] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

/** Nothing disappears: a skipped record goes to the tray with a visible slip count. */
export const RECORD_STATES = ['open', 'done', 'moved', 'dropped', 'tray'] as const;
export type RecordState = (typeof RECORD_STATES)[number];

export const records = sqliteTable('records', {
  ...syncColumns,
  kind: text('kind', { enum: RECORD_KINDS }).notNull(),
  title: text('title').notNull(),
  /** What this costs its day. The only number the capacity bar reads. */
  lengthMinutes: integer('length_minutes').notNull().default(0),
  /** Epoch ms. Null means unscheduled — it is in the tray or the inbox. */
  startAt: integer('start_at'),
  /** An appointment is fixed time; it renders taupe rather than as committed load. */
  isFixed: integer('is_fixed', { mode: 'boolean' }).notNull().default(false),
  projectId: text('project_id'),
  recurrenceId: text('recurrence_id'),
  /** Epoch ms of a reminder the user set. Not a scheduled notification of ours. */
  remindAt: integer('remind_at'),
  notes: text('notes'),
  /** Routine steps and errand stops, as JSON arrays of strings. */
  steps: text('steps', { mode: 'json' }).$type<string[]>(),
  stops: text('stops', { mode: 'json' }).$type<string[]>(),
  /**
   * This record **is** a calendar event, mirrored in. The calendar owns it: it is
   * read-only here and edited where it came from, which is what the design says an
   * imported appointment is.
   */
  calendarEventId: text('calendar_event_id'),
  /**
   * This record **has** a calendar event, written out. Moed owns it; the event follows.
   *
   * Two columns rather than one with a direction, because they mean opposite things
   * about who is allowed to change what, and a single field would put that distinction
   * somewhere a reader has to remember rather than somewhere they can see.
   */
  mirroredEventId: text('mirrored_event_id'),
  state: text('state', { enum: RECORD_STATES }).notNull().default('open'),
  /** How many times this has been skipped. Shown in the tray, never hidden. */
  slipCount: integer('slip_count').notNull().default(0),
  /**
   * A running session, and what it has been fed so far.
   *
   * `timerStartedAt` is epoch ms of the sitting currently under way, and null whenever
   * one is not — paused, or never started. `timerSeconds` is what previous sittings
   * added up to. Elapsed is the sum of the two, so the count survives the app being
   * closed and does not depend on the screen staying open, which a timer kept in React
   * state would.
   *
   * Two columns rather than a `sittings` table, deliberately, and it is worth knowing
   * which was traded away: this remembers how long, not when or how many times. If the
   * shut day, or activity sync closing a Session in phase 4, ever needs to show the
   * sittings themselves, that wants rows and this becomes their sum.
   */
  timerStartedAt: integer('timer_started_at'),
  timerSeconds: integer('timer_seconds').notNull().default(0),
});

export const RECUR_FREQ = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export const RECUR_ENDS = ['never', 'onDate', 'afterN'] as const;

export const recurrences = sqliteTable('recurrences', {
  ...syncColumns,
  freq: text('freq', { enum: RECUR_FREQ }).notNull(),
  interval: integer('interval').notNull().default(1),
  /** 0 = Sunday … 6 = Saturday, as a JSON array. */
  byWeekday: text('by_weekday', { mode: 'json' }).$type<number[]>(),
  ends: text('ends', { enum: RECUR_ENDS }).notNull().default('never'),
  endsOn: integer('ends_on'),
  endsAfter: integer('ends_after'),
});

export const projects = sqliteTable('projects', {
  ...syncColumns,
  name: text('name').notNull(),
  colour: text('colour'),
  /** Optional deadline and money budget — an event is a project with a date and a budget. */
  dueAt: integer('due_at'),
  budgetMinor: integer('budget_minor'),
  currency: text('currency'),
  archivedAt: integer('archived_at'),
});

/**
 * The day's hour limit. Default is 08:30–18:00 = 570 minutes. A short night can
 * lower it (`source: 'sleep'`), which is the one thing allowed to move it
 * automatically — and it is proposed, never applied silently.
 */
export const DAY_LIMIT_SOURCES = ['default', 'sleep', 'manual'] as const;

export const dayLimits = sqliteTable(
  'day_limits',
  {
    ...syncColumns,
    /** ISO date, yyyy-mm-dd, in the user's local zone. */
    date: text('date').notNull(),
    limitMinutes: integer('limit_minutes').notNull().default(570),
    source: text('source', { enum: DAY_LIMIT_SOURCES }).notNull().default('default'),
  },
  (t) => [uniqueIndex('day_limits_user_date').on(t.userId, t.date)],
);

// ---------------------------------------------------------------- money

export const BILL_CADENCES = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'] as const;

/**
 * Amounts are minor units (pence, cents) as integers. Money is never a float.
 *
 * A bill amortises across the weeks between occurrences — rent at 980 a month is 226
 * a week, sitting in the taupe segment exactly as fixed time does on a day. That
 * spreading is derived at read time, not stored: the due date still fires the bill's
 * own alert, because the cash-flow event and the budget effect are separate things.
 */
export const bills = sqliteTable('bills', {
  ...syncColumns,
  title: text('title').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull(),
  cadence: text('cadence', { enum: BILL_CADENCES }).notNull(),
  /** Epoch ms of the next occurrence. */
  dueAt: integer('due_at'),
  /** Epoch ms of an alert the user set for the due date. */
  remindAt: integer('remind_at'),
});

export const spending = sqliteTable('spending', {
  ...syncColumns,
  title: text('title').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull(),
  spentAt: integer('spent_at').notNull(),
  projectId: text('project_id'),
});

// ---------------------------------------------------------------- diet (paid)

export const FOOD_SOURCES = ['text', 'photo', 'voice', 'saved'] as const;
export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

/**
 * Calories are stored as a range, never a single number. Estimates are ranges is a
 * product non-negotiable, and storing one number would make rendering the honest
 * thing impossible later. A confirmed portion tightens the range; it does not
 * collapse it to a point.
 */
export const foodLogs = sqliteTable('food_logs', {
  ...syncColumns,
  name: text('name').notNull(),
  kcalMin: integer('kcal_min').notNull(),
  kcalMax: integer('kcal_max').notNull(),
  loggedAt: integer('logged_at').notNull(),
  slot: text('slot', { enum: MEAL_SLOTS }),
  source: text('source', { enum: FOOD_SOURCES }).notNull(),
  /** Set when this came from the user's own library — a saved food never calls the model again. */
  savedFoodId: text('saved_food_id'),
  portion: text('portion'),
  proteinG: real('protein_g'),
  carbsG: real('carbs_g'),
  fatG: real('fat_g'),
  /** Planned but not yet eaten. Renders taupe at .75 with a dashed edge. */
  isEstimate: integer('is_estimate', { mode: 'boolean' }).notNull().default(false),
});

/** Confirming an estimate saves it here, and it is free from then on. */
export const savedFoods = sqliteTable('saved_foods', {
  ...syncColumns,
  name: text('name').notNull(),
  kcalMin: integer('kcal_min').notNull(),
  kcalMax: integer('kcal_max').notNull(),
  portion: text('portion'),
  proteinG: real('protein_g'),
  carbsG: real('carbs_g'),
  fatG: real('fat_g'),
  useCount: integer('use_count').notNull().default(0),
});

export const weighIns = sqliteTable('weigh_ins', {
  ...syncColumns,
  /** Grams, as an integer. */
  weightGrams: integer('weight_grams').notNull(),
  measuredAt: integer('measured_at').notNull(),
  /** True when this came from a connected source rather than being typed. */
  fromHealth: integer('from_health', { mode: 'boolean' }).notNull().default(false),
});

// ---------------------------------------------------------------- account

/** Flat key/value. Values are JSON so a setting can grow without a migration. */
export const settings = sqliteTable(
  'settings',
  {
    ...syncColumns,
    key: text('key').notNull(),
    value: text('value', { mode: 'json' }).$type<unknown>(),
  },
  (t) => [uniqueIndex('settings_user_key').on(t.userId, t.key)],
);

export const PLAN_STATES = ['free', 'trial', 'paid', 'lapsed'] as const;

/**
 * Cached locally so entitlement survives offline. The server is the authority, but a
 * plane with no signal is not a reason to lock someone out of their own planner.
 *
 * Two independent trial clocks, each started by first use — diet on the first food
 * log, activity on the first successful sync. Never on sign-up: connecting a source
 * can take days and must not burn trial days.
 */
export const entitlements = sqliteTable('entitlements', {
  ...syncColumns,
  state: text('state', { enum: PLAN_STATES }).notNull().default('free'),
  dietTrialStartedAt: integer('diet_trial_started_at'),
  activityTrialStartedAt: integer('activity_trial_started_at'),
  /** Epoch ms the paid period runs to. Lapsing makes data read-only, never hidden. */
  paidUntil: integer('paid_until'),
  /** Trial binds to the device as well as the account; take the stricter of the two. */
  deviceId: text('device_id'),
});

// ---------------------------------------------------------------- health: local only

/**
 * Health data never leaves the device. These four tables have no sync columns and no
 * server-side counterpart — they cannot leak because there is nowhere for them to go.
 * The sync layer excludes them by their absence from `syncedTables` below, not by a
 * rule someone has to remember.
 *
 * Three scopes are read and no more: sleep, workouts, weight. Steps and active energy
 * are deferred. Heart rate is never requested.
 */
const localColumns = {
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
};

export const healthSleep = sqliteTable('health_sleep', {
  ...localColumns,
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at').notNull(),
  asleepMinutes: integer('asleep_minutes').notNull(),
  source: text('source'),
});

export const healthWorkouts = sqliteTable('health_workouts', {
  ...localColumns,
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at').notNull(),
  activity: text('activity'),
  source: text('source'),
  /**
   * Read, stored, and never added back to a calorie allowance. Per-workout burn is
   * the least reliable number in the system; activity moves the allowance only
   * through the three-week recalibration.
   */
  burnKcal: integer('burn_kcal'),
  /** The record this closed, if it closed one. Shown once, with an undo. */
  closedRecordId: text('closed_record_id'),
});

export const healthWeight = sqliteTable('health_weight', {
  ...localColumns,
  weightGrams: integer('weight_grams').notNull(),
  measuredAt: integer('measured_at').notNull(),
  source: text('source'),
});

export const healthSyncState = sqliteTable('health_sync_state', {
  ...localColumns,
  scope: text('scope').notNull(),
  lastReadAt: integer('last_read_at'),
  /** Absence of any source is a normal state, not a failure. */
  backfilledAt: integer('backfilled_at'),
});

// ---------------------------------------------------------------- sync surface

/**
 * The tables the sync layer is allowed to touch. Health tables are absent by design;
 * adding one here would be the only way to leak health data off the device, which is
 * exactly why the list is explicit and lives beside the schema.
 */
export const syncedTables = {
  records,
  recurrences,
  projects,
  dayLimits,
  bills,
  spending,
  foodLogs,
  savedFoods,
  weighIns,
  settings,
  entitlements,
} as const;

export type SyncedTableName = keyof typeof syncedTables;

/** A convenience for `updated_at` comparisons in raw SQL. */
export const nowMs = sql`(cast(strftime('%s','now') as integer) * 1000)`;
