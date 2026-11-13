import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { utcToday } from "@/lib/alerts/data";
import { db } from "@/lib/db";
import { checkin, countermeasureEntry, doseEntry, giEntry, sleepEntry, vitalsEntry } from "@/lib/db/schema";
import { computeGamification, type ActivityDay, type GamificationSummary } from "./rules";

const day = (iso: string) => iso.slice(0, 10);

/**
 * Every logged activity of one user as (activity, UTC day): check-ins, vitals,
 * sleep (the night it covers), dose readings, exercise sessions and GI entries. Demo seed
 * rows count too: they stand in for the demo crew's past logging.
 */
export function activityFor(userId: number): ActivityDay[] {
  const rows = (table: typeof checkin | typeof vitalsEntry | typeof doseEntry | typeof countermeasureEntry | typeof giEntry) =>
    db.select({ recordedAt: table.recordedAt }).from(table).where(eq(table.userId, userId)).all();
  return [
    ...rows(checkin).map((r) => ({ activity: "checkin" as const, day: day(r.recordedAt) })),
    ...rows(vitalsEntry).map((r) => ({ activity: "vitals" as const, day: day(r.recordedAt) })),
    ...db
      .select({ night: sleepEntry.night })
      .from(sleepEntry)
      .where(eq(sleepEntry.userId, userId))
      .all()
      .map((r) => ({ activity: "sleep" as const, day: r.night })),
    ...rows(doseEntry).map((r) => ({ activity: "dose" as const, day: day(r.recordedAt) })),
    // Exercise days: logs with exercise minutes (intake-only logs don't count).
    ...db
      .select({ recordedAt: countermeasureEntry.recordedAt })
      .from(countermeasureEntry)
      .where(and(eq(countermeasureEntry.userId, userId), gt(countermeasureEntry.minutes, 0)))
      .all()
      .map((r) => ({ activity: "exercise" as const, day: day(r.recordedAt) })),
    ...rows(giEntry).map((r) => ({ activity: "gi" as const, day: day(r.recordedAt) })),
  ];
}

export function gamificationFor(userId: number, today = utcToday()): GamificationSummary {
  return computeGamification(activityFor(userId), today);
}
