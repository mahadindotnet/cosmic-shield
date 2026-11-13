CREATE TABLE `notification_read` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`key` text NOT NULL,
	`read_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_read_user_key` ON `notification_read` (`user_id`,`key`);