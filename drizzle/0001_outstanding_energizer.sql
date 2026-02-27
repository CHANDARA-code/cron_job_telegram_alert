ALTER TABLE `schedules` ADD `last_run_at` integer;--> statement-breakpoint
ALTER TABLE `schedules` ADD `last_status` text;--> statement-breakpoint
ALTER TABLE `schedules` ADD `last_error` text;--> statement-breakpoint
ALTER TABLE `schedules` ADD `last_sent_at` integer;--> statement-breakpoint
ALTER TABLE `schedules` ADD `failure_count` integer DEFAULT 0 NOT NULL;