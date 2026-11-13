import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sleepEntry } from "@/lib/db/schema";
import type { NightlyReading } from "@/lib/rules/hrv-sleep-decline";
import { HRV_SLEEP_DECLINE_CONFIG } from "@/lib/rules/hrv-sleep-decline";
import { utcToday } from "@/lib/vitals/data";
import type { SleepInput } from "./schema";
import { summarizeSleep, toNightly, type SleepRow, type SleepSummary } from "./summary";

/** Rows read per user: comfortably more than the 14-night trend and the rule's baseline. */
const ROW_LIMIT = 200;

export function insertSleep(userId: number, input: SleepInput, enteredBy: number) {
  const now = new Date().toISOString();
  return db
    .insert(sleepEntry)
    .values({
      userId,
      enteredBy,
      source: "manual",
      // The sleep period starts the evening of `night` (UTC); the exact time isn't asked for.
      recordedAt: `${input.night}T22:00:00.000Z`,
      createdAt: now,
      night: input.night,
      sleepHours: input.sleepHours,
      quality: input.quality,
      hrvRmssd: input.hrvRmssd,
      stress: input.stress,
    })
    .run();
}

/** One user's sleep entries, newest night first. Callers must have checked access to `userId`. */
export function sleepRowsFor(userId: number, limit = ROW_LIMIT): SleepRow[] {
  return db
    .select({
      id: sleepEntry.id,
      night: sleepEntry.night,
      createdAt: sleepEntry.createdAt,
      source: sleepEntry.source,
      sleepHours: sleepEntry.sleepHours,
      quality: sleepEntry.quality,
      hrvRmssd: sleepEntry.hrvRmssd,
      stress: sleepEntry.stress,
    })
    .from(sleepEntry)
    .where(eq(sleepEntry.userId, userId))
    .orderBy(desc(sleepEntry.night), desc(sleepEntry.createdAt), desc(sleepEntry.id))
    .limit(limit)
    .all();
}

export function sleepSummaryFor(userId: number, nights = 14): SleepSummary {
  return summarizeSleep(sleepRowsFor(userId), utcToday(), nights, HRV_SLEEP_DECLINE_CONFIG.hrvDropPct);
}

/** Nightly HRV and sleep for the early-warning rule (newest entry per night). */
export function nightlyReadingsFor(userId: number): NightlyReading[] {
  return toNightly(sleepRowsFor(userId));
}
