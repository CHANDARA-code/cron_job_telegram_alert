CREATE TABLE `schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cron_expression` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Phnom_Penh' NOT NULL,
	`message` text NOT NULL,
	`parse_mode` text DEFAULT 'HTML' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
