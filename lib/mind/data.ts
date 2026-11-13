import "server-only";
import { desc, eq } from "drizzle-orm";
import { detectCrisis } from "@/lib/ai/safety";
import { AuthError } from "@/lib/auth/dal";
import type { UserRow } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { checkin } from "@/lib/db/schema";
import { utcToday } from "@/lib/vitals/data";
import type { CheckinInput } from "./schema";
import { recordSafetyEscalation } from "./safety-escalation";
import { summarizeMind, type CheckinRow, type MindSummary } from "./summary";

const ROW_LIMIT = 200;

/**
 * Saves a check-in. If the note mentions hopelessness, self-harm, wanting to
 * die or being unable to cope, a mind_safety escalation is written too.
 */
export function recordCheckin(crew: Pick<UserRow, "id" | "crewId">, enteredBy: number, input: CheckinInput) {
  const now = new Date().toISOString();
  db.insert(checkin)
    .values({
      userId: crew.id,
      enteredBy,
      source: "manual",
      recordedAt: now,
      createdAt: now,
      mood: input.mood,
      stress: input.stress,
      sleepQuality: input.sleepQuality,
      note: input.note,
    })
    .run();
  const crisis = input.note ? detectCrisis(input.note) : { triggered: false, categories: [] };
  const escalationId = crisis.triggered
    ? recordSafetyEscalation(crew, { source: "checkin_note", conversationId: null, categories: crisis.categories, recentMessages: [input.note!] })
    : null;
  return { safety: crisis.triggered, escalationId };
}

/** The crew member's own check-ins (notes included), newest first. */
export function checkinRowsFor(userId: number): CheckinRow[] {
  return db
    .select({
      id: checkin.id,
      recordedAt: checkin.recordedAt,
      source: checkin.source,
      mood: checkin.mood,
      stress: checkin.stress,
      sleepQuality: checkin.sleepQuality,
      note: checkin.note,
    })
    .from(checkin)
    .where(eq(checkin.userId, userId))
    .orderBy(desc(checkin.recordedAt), desc(checkin.id))
    .limit(ROW_LIMIT)
    .all();
}

/** For the crew member themself. */
export function mindSummaryFor(userId: number, days = 14): MindSummary {
  return summarizeMind(checkinRowsFor(userId), utcToday(), days);
}

/**
 * For the flight surgeon (Crew admin): scores and statuses only. Notes are
 * private to the crew member; a note that triggered the safety check is in the
 * escalation record instead.
 */
export function mindSummaryForReview(viewer: Pick<UserRow, "role">, crewUserId: number, days = 14): MindSummary {
  if (viewer.role !== "flight_surgeon") throw new AuthError(403, "Not allowed");
  return summarizeMind(
    checkinRowsFor(crewUserId).map((r) => ({ ...r, note: null })),
    utcToday(),
    days,
  );
}
