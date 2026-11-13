import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { alertAck } from "@/lib/db/schema";

/** Today as YYYY-MM-DD in UTC (station time on the ISS). */
export const utcToday = () => new Date().toISOString().slice(0, 10);

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
