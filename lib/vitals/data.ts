import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { escalation, vitalsEntry } from "@/lib/db/schema";
import { getBaselines } from "@/lib/nasa/loaders";
import { vitalsEscalation } from "./escalation";
import { evaluateVitals, type VitalsValues } from "./rules";
import { summarizeVitals, type VitalsRow, type VitalsSummary } from "./summary";

/** Newest rows kept on the page (history table + 14-day trend). */
const HISTORY_LIMIT = 200;

export const utcToday = () => new Date().toISOString().slice(0, 10);

/**
 * Saves a manual reading and, when the rules put it in Escalate, an
 * escalation record with its evidence, in one transaction.
 */
export function recordVitals(crew: { id: number; crewId: string }, enteredBy: number, values: VitalsValues) {
  const evaluation = evaluateVitals(values);
  const draft = vitalsEscalation(values, evaluation);
  return db.transaction((tx) => {
    const now = new Date().toISOString();
    const entry = tx
      .insert(vitalsEntry)
      .values({ userId: crew.id, enteredBy, source: "manual", recordedAt: now, createdAt: now, ...values })
      .run();
    const entryId = Number(entry.lastInsertRowid);
    let escalationId: number | null = null;
    if (draft) {
      const row = tx
        .insert(escalation)
        .values({
          userId: crew.id,
          crewId: crew.crewId,
          ruleId: draft.ruleId,
          entryTable: "vitals_entry",
          entryId,
          reason: draft.reason,
          evidenceJson: JSON.stringify(draft.evidence),
          createdAt: now,
        })
        .run();
      escalationId = Number(row.lastInsertRowid);
    }
    return { entryId, evaluation, escalationId };
  });
}

/** One user's escalations, newest first. */
export function escalationsFor(userId: number, limit = 20) {
  return db.select().from(escalation).where(eq(escalation.userId, userId)).orderBy(desc(escalation.createdAt), desc(escalation.id)).limit(limit).all();
}

/** One user's vitals, newest first. Callers must have checked access to `userId`. */
export function vitalsRowsFor(userId: number, limit = HISTORY_LIMIT): VitalsRow[] {
  return db
    .select({
      id: vitalsEntry.id,
      recordedAt: vitalsEntry.recordedAt,
      source: vitalsEntry.source,
      heartRate: vitalsEntry.heartRate,
      systolic: vitalsEntry.systolic,
      diastolic: vitalsEntry.diastolic,
      spo2: vitalsEntry.spo2,
      glucose: vitalsEntry.glucose,
    })
    .from(vitalsEntry)
    .where(eq(vitalsEntry.userId, userId))
    .orderBy(desc(vitalsEntry.recordedAt), desc(vitalsEntry.id))
    .limit(limit)
    .all();
}

export function vitalsSummaryFor(userId: number, days = 14): VitalsSummary {
  return summarizeVitals(vitalsRowsFor(userId), utcToday(), days);
}

export interface CrewReferenceBand {
  min: number;
  max: number;
  median: number;
  /** Samples behind the band. */
  samples: number;
  label: string;
  source: string;
  detail: string;
}

/**
 * Inspiration4 pre-flight glucose range (NASA OSDR OSD-575): min–max of all
 * pre-flight samples (L-92, L-44, L-3) from the 4 crew. A reference for
 * context only; it does not set the Watch bounds.
 */
export function glucoseCrewReference(): CrewReferenceBand | null {
  const { data } = getBaselines();
  const g = data.pooled.preflight_baseline.find((a) => a.analyte === "Glucose");
  if (!g) return null;
  return {
    min: g.min,
    max: g.max,
    median: g.median,
    samples: g.n,
    label: `Inspiration4 crew reference (n=${data.crew.length})`,
    source: data.source,
    detail: `Pre-flight samples ${g.timepoints.join(", ")} (${g.n} samples). ${"analyte_note" in g && g.analyte_note ? g.analyte_note : ""}`.trim(),
  };
}
