CREATE TABLE `escalation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`crew_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`entry_table` text NOT NULL,
	`entry_id` integer NOT NULL,
	`reason` text NOT NULL,
	`evidence_json` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` integer,
	`reviewed_by` integer
);
--> statement-breakpoint
CREATE INDEX `escalation_user_time` ON `escalation` (`user_id`,`created_at`);