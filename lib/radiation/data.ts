import "server-only";
import { desc, eq, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { doseEntry, escalation } from "@/lib/db/schema";
import { sourceText } from "@/lib/vitals/rules";
import { utcToday } from "@/lib/vitals/data";
import { evaluateCareer, evaluateDose, RADIATION_LIMITS } from "./rules";
import type { DoseInput } from "./schema";
import { summarizeRadiation, type DoseRow, type RadiationSummary } from "./summary";

export const RADIATION_CAREER_RULE_ID = "radiation_career";

/** Career total so far (sum of every dose entry), mSv. */
export function careerTotalFor(userId: number): number {
  const row = db.select({ total: sum(doseEntry.doseMsv) }).from(doseEntry).where(eq(doseEntry.userId, userId)).get();
  return Number(row?.total ?? 0);
}

/**
 * Saves a dosimeter reading in the user's current mission environment. If it
 * takes the career total above the 600 mSv limit, an escalation record is
 * written in the same transaction.
 */
export function recordDose(
  crew: { id: number; crewId: string; environment: string | null },
  enteredBy: number,
  input: DoseInput,
) {
  return db.transaction((tx) => {
    const now = new Date();
    const before = careerTotalFor(crew.id);
    const recordedAt = input.day === now.toISOString().slice(0, 10) ? now.toISOString() : `${input.day}T12:00:00.000Z`;
    const entry = tx
      .insert(doseEntry)
      .values({
        userId: crew.id,
        enteredBy,
        source: "manual",
        recordedAt,
        createdAt: now.toISOString(),
        doseMsv: input.doseMsv,
        periodHours: input.periodHours,
        environment: crew.environment,
        note: input.note,
      })
      .run();
    const entryId = Number(entry.lastInsertRowid);
    const dose = evaluateDose({ ...input, environment: crew.environment });
    const career = evaluateCareer(before + input.doseMsv);

    let escalationId: number | null = null;
    if (career.status === "escalate" && before <= RADIATION_LIMITS.careerLimit) {
      const row = tx
        .insert(escalation)
        .values({
          userId: crew.id,
          crewId: crew.crewId,
          ruleId: RADIATION_CAREER_RULE_ID,
          entryTable: "dose_entry",
          entryId,
          reason: career.reason!,
          evidenceJson: JSON.stringify({
            careerBeforeMsv: before,
            entryMsv: input.doseMsv,
            careerAfterMsv: career.totalMsv,
            limit: {
              rule: `career dose > ${RADIATION_LIMITS.careerLimit} mSv`,
              basis: "sourced",
              source: RADIATION_LIMITS.careerLimitSource,
              citation: sourceText(RADIATION_LIMITS.careerLimitSource),
            },
          }),
          createdAt: now.toISOString(),
        })
        .run();
      escalationId = Number(row.lastInsertRowid);
    }
    return { entryId, dose, career, escalationId };
  });
}

/** One user's dose entries, newest first. Callers must have checked access to `userId`. */
export function doseRowsFor(userId: number): DoseRow[] {
  return db
    .select({
      id: doseEntry.id,
      recordedAt: doseEntry.recordedAt,
      source: doseEntry.source,
      doseMsv: doseEntry.doseMsv,
      periodHours: doseEntry.periodHours,
      environment: doseEntry.environment,
      note: doseEntry.note,
    })
    .from(doseEntry)
    .where(eq(doseEntry.userId, userId))
    .orderBy(desc(doseEntry.recordedAt), desc(doseEntry.id))
    .all();
}

export function radiationSummaryFor(userId: number, days = 14): RadiationSummary {
  return summarizeRadiation(doseRowsFor(userId), utcToday(), days);
}
