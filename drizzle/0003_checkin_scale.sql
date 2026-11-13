ALTER TABLE `checkin` ADD `sleep_quality` integer;--> statement-breakpoint
-- Rows written before this migration used a 0–10 scale. Convert them once to 1–5
-- (1 + round(value × 0.4), clamped): 0 → 1, 5 → 3, 10 → 5. Every row that exists
-- when this runs is old-scale, because the app writes 1–5 only from here on.
UPDATE `checkin` SET `mood` = MIN(5, MAX(1, CAST(ROUND(1 + `mood` * 0.4) AS INTEGER)));--> statement-breakpoint
UPDATE `checkin` SET `stress` = MIN(5, MAX(1, CAST(ROUND(1 + `stress` * 0.4) AS INTEGER))) WHERE `stress` IS NOT NULL;--> statement-breakpoint
UPDATE `checkin` SET `energy` = MIN(5, MAX(1, CAST(ROUND(1 + `energy` * 0.4) AS INTEGER))) WHERE `energy` IS NOT NULL;
