import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { alertAck, vitalReading } from "@/lib/db/schema";
import { NIGHTLY_METRICS } from "@/lib/demo/nightly";
import type { NightlyReading } from "@/lib/rules/hrv-sleep-decline";

/** Today as YYYY-MM-DD in UTC (station time on the ISS). */
export const utcToday = () => new Date().toISOString().slice(0, 10);

/** Nightly HRV (RMSSD) and sleep for a crew profile, one entry per night. */
export function nightlyReadings(profileId: string): NightlyReading[] {
  const rows = db
    .select({
      metric: vitalReading.metric,
      value: vitalReading.value,
      recordedAt: vitalReading.recordedAt,
    })
    .from(vitalReading)
    .where(
      and(
        eq(vitalReading.crewId, profileId),
        inArray(vitalReading.metric, [
          NIGHTLY_METRICS.hrv,
          NIGHTLY_METRICS.sleep,
        ]),
      ),
    )
    .all();
  const byNight = new Map<string, NightlyReading>();
  for (const r of rows) {
    const night = r.recordedAt.slice(0, 10);
    const entry = byNight.get(night) ?? {
      night,
      hrvMs: null,
      sleepHours: null,
    };
    if (r.metric === NIGHTLY_METRICS.hrv) entry.hrvMs = r.value;
    else entry.sleepHours = r.value;
    byNight.set(night, entry);
  }
  return [...byNight.values()].sort((a, b) => a.night.localeCompare(b.night));
}

export function isAcknowledged(userId: number, ruleId: string, day: string) {
  return Boolean(
    db
      .select({ id: alertAck.id })
      .from(alertAck)
      .where(
        and(
          eq(alertAck.userId, userId),
          eq(alertAck.ruleId, ruleId),
          eq(alertAck.day, day),
        ),
      )
      .get(),
  );
}

export function acknowledge(
  userId: number,
  crewId: string,
  ruleId: string,
  day: string,
) {
  db.insert(alertAck)
    .values({ userId, crewId, ruleId, day, acknowledgedAt: Date.now() })
    .run();
}
