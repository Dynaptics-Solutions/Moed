CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`title` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`cadence` text NOT NULL,
	`due_at` integer,
	`remind_at` integer
);
--> statement-breakpoint
CREATE TABLE `day_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`date` text NOT NULL,
	`limit_minutes` integer DEFAULT 570 NOT NULL,
	`source` text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_limits_user_date` ON `day_limits` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`state` text DEFAULT 'free' NOT NULL,
	`diet_trial_started_at` integer,
	`activity_trial_started_at` integer,
	`paid_until` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE TABLE `food_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`name` text NOT NULL,
	`kcal_min` integer NOT NULL,
	`kcal_max` integer NOT NULL,
	`logged_at` integer NOT NULL,
	`slot` text,
	`source` text NOT NULL,
	`saved_food_id` text,
	`portion` text,
	`protein_g` real,
	`carbs_g` real,
	`fat_g` real,
	`is_estimate` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_sleep` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`asleep_minutes` integer NOT NULL,
	`source` text
);
--> statement-breakpoint
CREATE TABLE `health_sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`scope` text NOT NULL,
	`last_read_at` integer,
	`backfilled_at` integer
);
--> statement-breakpoint
CREATE TABLE `health_weight` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`weight_grams` integer NOT NULL,
	`measured_at` integer NOT NULL,
	`source` text
);
--> statement-breakpoint
CREATE TABLE `health_workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`activity` text,
	`source` text,
	`burn_kcal` integer,
	`closed_record_id` text
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`name` text NOT NULL,
	`colour` text,
	`due_at` integer,
	`budget_minor` integer,
	`currency` text,
	`archived_at` integer
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`length_minutes` integer DEFAULT 0 NOT NULL,
	`start_at` integer,
	`is_fixed` integer DEFAULT false NOT NULL,
	`project_id` text,
	`recurrence_id` text,
	`remind_at` integer,
	`notes` text,
	`steps` text,
	`stops` text,
	`state` text DEFAULT 'open' NOT NULL,
	`slip_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`freq` text NOT NULL,
	`interval` integer DEFAULT 1 NOT NULL,
	`by_weekday` text,
	`ends` text DEFAULT 'never' NOT NULL,
	`ends_on` integer,
	`ends_after` integer
);
--> statement-breakpoint
CREATE TABLE `saved_foods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`name` text NOT NULL,
	`kcal_min` integer NOT NULL,
	`kcal_max` integer NOT NULL,
	`portion` text,
	`protein_g` real,
	`carbs_g` real,
	`fat_g` real,
	`use_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`key` text NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_user_key` ON `settings` (`user_id`,`key`);--> statement-breakpoint
CREATE TABLE `spending` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`title` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`spent_at` integer NOT NULL,
	`project_id` text
);
--> statement-breakpoint
CREATE TABLE `weigh_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_synced_at` integer,
	`weight_grams` integer NOT NULL,
	`measured_at` integer NOT NULL,
	`from_health` integer DEFAULT false NOT NULL
);
