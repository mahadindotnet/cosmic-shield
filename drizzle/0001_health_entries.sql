CREATE TABLE `checkin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`entered_by` integer NOT NULL,
	`created_at` text NOT NULL,
	`mood` integer NOT NULL,
	`stress` integer,
	`energy` integer,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `checkin_user_time` ON `checkin` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `countermeasure_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`entered_by` integer NOT NULL,
	`created_at` text NOT NULL,
	`kind` text NOT NULL,
	`minutes` integer NOT NULL,
	`effort` integer,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `countermeasure_entry_user_time` ON `countermeasure_entry` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `dose_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`entered_by` integer NOT NULL,
	`created_at` text NOT NULL,
	`dose_msv` real NOT NULL,
	`period_hours` real DEFAULT 24 NOT NULL,
	`environment` text,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `dose_entry_user_time` ON `dose_entry` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `eye_screening` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`entered_by` integer NOT NULL,
	`created_at` text NOT NULL,
	`kind` text NOT NULL,
	`eye` text NOT NULL,
	`amsler_result` text,
	`amsler_marks` text,
	`photo_path` text,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `eye_screening_user_time` ON `eye_screening` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `gi_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`entered_by` integer NOT NULL,
	`created_at` text NOT NULL,
	`bristol_type` integer,
	`hydration_liters` real,
	`symptoms` text,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `gi_entry_user_time` ON `gi_entry` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `sleep_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`entered_by` integer NOT NULL,
	`created_at` text NOT NULL,
	`night` text NOT NULL,
	`sleep_hours` real NOT NULL,
	`hrv_rmssd` real,
	`quality` integer,
	`stress` integer
);
--> statement-breakpoint
CREATE INDEX `sleep_entry_user_night` ON `sleep_entry` (`user_id`,`night`);--> statement-breakpoint
CREATE TABLE `vitals_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`entered_by` integer NOT NULL,
	`created_at` text NOT NULL,
	`heart_rate` integer NOT NULL,
	`systolic` integer NOT NULL,
	`diastolic` integer NOT NULL,
	`spo2` integer NOT NULL,
	`glucose` real
);
--> statement-breakpoint
CREATE INDEX `vitals_entry_user_time` ON `vitals_entry` (`user_id`,`recorded_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `environment` text;