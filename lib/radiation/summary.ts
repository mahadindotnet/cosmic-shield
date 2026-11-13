import { addDays, dayLabel, type DailyPoint } from "@/lib/vitals/summary";
import { evaluateCareer, evaluateDose, round, type CareerEvaluation, type DoseEvaluation, type DoseStatus, type DoseValues } from "./rules";

export interface DoseRow extends DoseValues {
  id: number;
  /** When the reading was taken (ISO UTC). */
  recordedAt: string;
  note: string | null;
  source: "manual" | "seed" | "device";
}

export interface DoseHistoryRow extends DoseRow {
  rate: number;
  status: DoseStatus;
  reason?: string;
}

export interface RadiationSummary {
  latest: (DoseRow & { evaluation: DoseEvaluation }) | null;
  history: DoseHistoryRow[];
  /** Mean daily rate per UTC day (readings of 48 h or less), oldest first, ending today. */
  trend: DailyPoint[];
  /** Sum of every dose entry. */
  career: CareerEvaluation;
  /** Dose logged in the trend window, mSv. */
  windowTotalMsv: number;
  tile: { value: string; unit: string; status: DoseStatus } | null;
}

/** Readings longer than this are summaries (e.g. a previous mission) and stay out of the daily trend. */
const TREND_MAX_PERIOD_HOURS = 48;

export function summarizeRadiation(rows: DoseRow[], today: string, days = 14): RadiationSummary {
  const sorted = [...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id - a.id);
  const history = sorted.map((r) => {
    const e = evaluateDose(r);
    return { ...r, rate: e.rate, status: e.status, reason: e.reason };
  });
  const latestRow = sorted[0] ?? null;
  const latest = latestRow ? { ...latestRow, evaluation: evaluateDose(latestRow) } : null;

  const start = addDays(today, -(days - 1));
  const perDay = new Map<string, number[]>();
  let windowTotal = 0;
  for (const h of history) {
    const day = h.recordedAt.slice(0, 10);
    if (day < start || day > today) continue;
    windowTotal += h.doseMsv;
    if (h.periodHours > TREND_MAX_PERIOD_HOURS) continue;
    perDay.set(day, [...(perDay.get(day) ?? []), h.rate]);
  }
  const trend = Array.from({ length: days }, (_, i) => {
    const day = addDays(start, i);
    const rates = perDay.get(day);
    return { day, label: dayLabel(day), value: rates ? round(rates.reduce((a, b) => a + b, 0) / rates.length) : null };
  });

  return {
    latest,
    history,
    trend,
    career: evaluateCareer(rows.reduce((a, r) => a + r.doseMsv, 0)),
    windowTotalMsv: round(windowTotal, 2),
    tile: latest ? { value: `${latest.evaluation.rate}`, unit: "mSv/d", status: latest.evaluation.status } : null,
  };
}

/** Projected dose for a full mission at an environment's typical daily rate. */
export const projectedMissionMsv = (msvPerDay: number, missionDays: number) => round(msvPerDay * missionDays, 0);
