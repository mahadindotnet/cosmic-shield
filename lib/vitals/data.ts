import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vitalsEntry, type EntrySource } from "@/lib/db/schema";
import { getBaselines } from "@/lib/nasa/loaders";
import type { VitalsValues } from "./rules";
import { summarizeVitals, type VitalsRow, type VitalsSummary } from "./summary";

/** Newest rows kept on the page (history table + 14-day trend). */
const HISTORY_LIMIT = 200;

export const utcToday = () => new Date().toISOString().slice(0, 10);

export function insertVitals(
  userId: number,
  values: VitalsValues,
  opts: { enteredBy: number; source?: EntrySource; recordedAt?: string },
) {
  const now = new Date().toISOString();
  return db
    .insert(vitalsEntry)
    .values({
      userId,
      enteredBy: opts.enteredBy,
      source: opts.source ?? "manual",
      recordedAt: opts.recordedAt ?? now,
      createdAt: now,
      ...values,
    })
    .run();
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
