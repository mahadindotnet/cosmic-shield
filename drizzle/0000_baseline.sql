CREATE TABLE `alert_ack` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`crew_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`day` text NOT NULL,
	`acknowledged_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `check_in` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`crew_id` text NOT NULL,
	`affect_score` integer NOT NULL,
	`note` text NOT NULL,
	`recorded_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crew` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `escalation_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`crew_id` text NOT NULL,
	`level` text NOT NULL,
	`reason` text NOT NULL,
	`evidence_json` text NOT NULL,
	`recorded_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`crew_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`success` integer NOT NULL,
	`reason` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`crew_id` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`profile_id` text,
	`pin_hash` text NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`must_change_pin` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_crew_id_unique` ON `users` (`crew_id`);--> statement-breakpoint
CREATE TABLE `vital_reading` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`crew_id` text NOT NULL,
	`metric` text NOT NULL,
	`value` real NOT NULL,
	`mission_day` integer NOT NULL,
	`recorded_at` text NOT NULL
);
