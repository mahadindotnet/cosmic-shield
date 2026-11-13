import type { NightlyReading } from "@/lib/rules/hrv-sleep-decline";
import { addDays, dayLabel, type DailyPoint } from "@/lib/vitals/summary";
import { evaluateSleep, type SleepEvaluation, type SleepStatus, type SleepValues } from "./rules";

export interface SleepRow extends SleepValues {
  id: number;
  night: string;
  /** When the row was saved (ISO UTC); the newest row for a night wins. */
  createdAt: string;
  source: "manual" | "seed" | "device";
}

export interface SleepHistoryRow extends SleepRow {
  status: SleepStatus;
  reasons: string[];
  /** False when a newer entry for the same night replaced this one. */
  current: boolean;
}

export type SleepTrendKey = "sleepHours" | "hrvRmssd" | "stress";

export interface SleepSummary {
  latest: (SleepRow & { evaluation: SleepEvaluation }) | null;
  history: SleepHistoryRow[];
  /** One point per night, oldest first, `nights` long, ending last night. */
  trends: Record<SleepTrendKey, DailyPoint[]>;
  /** Mean HRV over the trend window ±10 % (the early-warning drop), or null. */
  hrvBand: { min: number; max: number; mean: number } | null;
  tile: { value: string; unit: string; status: SleepStatus; night: string } | null;
}

const newestFirst = (a: SleepRow, b: SleepRow) =>
  b.night.localeCompare(a.night) || b.createdAt.localeCompare(a.createdAt) || b.id - a.id;

/** One row per night: the newest entry (a manual re-entry replaces the seed). Oldest night first. */
export function currentPerNight(rows: SleepRow[]): SleepRow[] {
  const byNight = new Map<string, SleepRow>();
  for (const r of [...rows].sort(newestFirst)) if (!byNight.has(r.night)) byNight.set(r.night, r);
  return [...byNight.values()].sort((a, b) => a.night.localeCompare(b.night));
}

/** The nights in the shape the early-warning rule reads. */
export const toNightly = (rows: SleepRow[]): NightlyReading[] =>
  currentPerNight(rows).map((r) => ({ night: r.night, hrvMs: r.hrvRmssd, sleepHours: r.sleepHours }));

export function summarizeSleep(rows: SleepRow[], today: string, nights = 14, hrvDropPct = 10): SleepSummary {
  const current = currentPerNight(rows);
  const currentIds = new Set(current.map((r) => r.id));
  const history = [...rows].sort(newestFirst).map((r) => {
    const e = evaluateSleep(r);
    return { ...r, status: e.status, reasons: e.reasons, current: currentIds.has(r.id) };
  });

  const lastNight = addDays(today, -1);
  const start = addDays(lastNight, -(nights - 1));
  const inWindow = current.filter((r) => r.night >= start && r.night <= lastNight);
  const byNight = new Map(inWindow.map((r) => [r.night, r]));
  const series = (key: SleepTrendKey): DailyPoint[] =>
    Array.from({ length: nights }, (_, i) => {
      const day = addDays(start, i);
      return { day, label: dayLabel(day), value: byNight.get(day)?.[key] ?? null };
    });

  const hrvs = inWindow.flatMap((r) => (r.hrvRmssd === null ? [] : [r.hrvRmssd]));
  const mean = hrvs.length ? hrvs.reduce((a, b) => a + b, 0) / hrvs.length : null;
  const latestRow = current.at(-1) ?? null;
  const latest = latestRow ? { ...latestRow, evaluation: evaluateSleep(latestRow) } : null;

  return {
    latest,
    history,
    trends: { sleepHours: series("sleepHours"), hrvRmssd: series("hrvRmssd"), stress: series("stress") },
    hrvBand:
      mean === null
        ? null
        : {
            mean: Math.round(mean * 10) / 10,
            min: Math.round(mean * (1 - hrvDropPct / 100) * 10) / 10,
            max: Math.round(mean * (1 + hrvDropPct / 100) * 10) / 10,
          },
    tile: latest ? { value: `${latest.sleepHours}`, unit: "h", status: latest.evaluation.status, night: latest.night } : null,
  };
}
