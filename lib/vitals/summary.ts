import { evaluateVitals, type MeasureCheck, type VitalsEvaluation, type VitalsStatus, type VitalsValues } from "./rules";

export interface VitalsRow extends VitalsValues {
  id: number;
  /** ISO UTC. */
  recordedAt: string;
  source: "manual" | "seed" | "device";
}

export interface VitalsHistoryRow extends VitalsRow {
  status: VitalsStatus;
  reasons: string[];
}

export interface DailyPoint {
  /** YYYY-MM-DD (UTC). */
  day: string;
  /** e.g. "08 Nov". */
  label: string;
  value: number | null;
}

export type TrendKey = "heartRate" | "systolic" | "diastolic" | "spo2" | "glucose";

export interface VitalsSummary {
  latest: (VitalsRow & { evaluation: VitalsEvaluation }) | null;
  history: VitalsHistoryRow[];
  /** One point per UTC day, oldest first, `days` long, ending today. */
  trends: Record<TrendKey, DailyPoint[]>;
  /** What the Health Dashboard tile shows. */
  tile: TileReading | null;
}

export interface TileReading {
  metric: string;
  value: string;
  unit: string;
  status: VitalsStatus;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** YYYY-MM-DD shifted by `delta` days (UTC). */
export function addDays(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export const dayLabel = (day: string) => `${day.slice(8, 10)} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;

/** Daily mean of one measure over the `days` days ending `today`; null on days without a reading. */
export function dailySeries(rows: VitalsRow[], key: TrendKey, today: string, days: number): DailyPoint[] {
  const start = addDays(today, -(days - 1));
  const sums = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const day = r.recordedAt.slice(0, 10);
    const v = r[key];
    if (day < start || day > today || v === null) continue;
    const s = sums.get(day) ?? { sum: 0, n: 0 };
    s.sum += v;
    s.n += 1;
    sums.set(day, s);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(start, i);
    const s = sums.get(day);
    return { day, label: dayLabel(day), value: s ? Math.round((s.sum / s.n) * 10) / 10 : null };
  });
}

/**
 * The tile shows one reading: the first flagged measure of the latest entry,
 * so a Watch is never shown next to an unrelated number; heart rate otherwise.
 */
export function tileReading(evaluation: VitalsEvaluation): TileReading {
  const flagged = evaluation.checks.find((c) => c.status === "watch");
  const c: MeasureCheck = flagged ?? evaluation.checks.find((x) => x.measure === "heartRate")!;
  return { metric: c.label, value: c.display, unit: c.unit, status: evaluation.status };
}

/** Builds everything the Vitals page and dashboard need from one user's rows. */
export function summarizeVitals(rows: VitalsRow[], today: string, days = 14): VitalsSummary {
  const sorted = [...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id - a.id);
  const history = sorted.map((r) => {
    const e = evaluateVitals(r);
    return { ...r, status: e.status, reasons: e.reasons };
  });
  const latestRow = sorted[0];
  const latest = latestRow ? { ...latestRow, evaluation: evaluateVitals(latestRow) } : null;
  const keys: TrendKey[] = ["heartRate", "systolic", "diastolic", "spo2", "glucose"];
  return {
    latest,
    history,
    trends: Object.fromEntries(keys.map((k) => [k, dailySeries(rows, k, today, days)])) as Record<TrendKey, DailyPoint[]>,
    tile: latest ? tileReading(latest.evaluation) : null,
  };
}
