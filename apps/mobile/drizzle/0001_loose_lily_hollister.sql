ALTER TABLE `records` ADD `timer_started_at` integer;--> statement-breakpoint
ALTER TABLE `records` ADD `timer_seconds` integer DEFAULT 0 NOT NULL;