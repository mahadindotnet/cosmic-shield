ALTER TABLE `eye_screening` ADD `centre_visible` integer;--> statement-breakpoint
ALTER TABLE `eye_screening` ADD `photo_analysis` text;--> statement-breakpoint
ALTER TABLE `eye_screening` ADD `ground_review` integer DEFAULT false NOT NULL;