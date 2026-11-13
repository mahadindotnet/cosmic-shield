import { addDays, dayLabel, type DailyPoint } from "@/lib/vitals/summary";
import { photoAnalysisLabel } from "./classifier";
import { bristolDescription, evaluateGi, fluidBand, GI_LIMITS, type GiDay, type GiEvaluation, type GiStatus } from "./rules";

export interface GiRow {
  id: number;
  /** ISO UTC; its date is the day the entry covers. */
  recordedAt: string;
  source: "manual" | "seed" | "device";
  bristolType: number | null;
  hydrationLiters: number | null;
  note: string | null;
  /** True when a photo is stored (the path itself never leaves the server). */
  hasPhoto: boolean;
  photoAnalysis: string | null;
}

export interface GiHistoryRow extends GiRow {
  day: string;
  description: string;
  /** e.g. "Not analysed: prototype"; null without a photo. */
  photoLabel: string | null;
}

export interface GiSummary {
  latest: GiHistoryRow | null;
  evaluation: GiEvaluation;
  /** Fluid logged today (L); null when none logged today. */
  fluidTodayL: number | null;
  fluidBand: ReturnType<typeof fluidBand> | null;
  history: GiHistoryRow[];
  /** Per day, oldest first, `days` long, ending today. Bristol: the day's latest type. */
  trends: { bristol: DailyPoint[]; fluid: DailyPoint[] };
  /** Health Dashboard tile: latest type and the 3-day pattern status. */
  tile: { metric: string; value: string; unit: string; status: Exclude<GiStatus, "no-data">; caption: string } | null;
  fluidTarget: { min: number; max: number };
}

const dayOf = (iso: string) => iso.slice(0, 10);

/** Types and fluid per UTC day, oldest first. */
export function giDays(rows: readonly GiRow[]): GiDay[] {
  const byDay = new Map<string, GiDay>();
  for (const r of [...rows].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id - b.id)) {
    const day = dayOf(r.recordedAt);
    const d = byDay.get(day) ?? { day, types: [], fluidL: 0 };
    if (r.bristolType !== null) d.types.push(r.bristolType);
    d.fluidL += r.hydrationLiters ?? 0;
    byDay.set(day, d);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function summarizeGi(rows: readonly GiRow[], today: string, days = 14): GiSummary {
  const perDay = giDays(rows);
  const byDay = new Map(perDay.map((d) => [d.day, d]));
  const start = addDays(today, -(days - 1));
  const series = (pick: (d: GiDay) => number | null): DailyPoint[] =>
    Array.from({ length: days }, (_, i) => {
      const day = addDays(start, i);
      const d = byDay.get(day);
      return { day, label: dayLabel(day), value: d ? pick(d) : null };
    });

  const history: GiHistoryRow[] = [...rows]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id - a.id)
    .map((r) => ({
      ...r,
      day: dayOf(r.recordedAt),
      description: r.bristolType === null ? "" : bristolDescription(r.bristolType),
      photoLabel: r.hasPhoto ? photoAnalysisLabel(r.photoAnalysis) : null,
    }));

  const evaluation = evaluateGi(perDay, today);
  const todayRows = rows.filter((r) => dayOf(r.recordedAt) === today && r.hydrationLiters !== null);
  const fluidTodayL = todayRows.length ? round1(todayRows.reduce((s, r) => s + (r.hydrationLiters ?? 0), 0)) : null;
  const latest = history[0] ?? null;

  return {
    latest,
    evaluation,
    fluidTodayL,
    fluidBand: fluidTodayL === null ? null : fluidBand(fluidTodayL),
    history,
    trends: {
      bristol: series((d) => d.types.at(-1) ?? null),
      fluid: series((d) => (d.fluidL > 0 ? round1(d.fluidL) : null)),
    },
    tile:
      evaluation.status === "no-data" || !latest || latest.bristolType === null
        ? null
        : {
            metric: "Bristol type (latest)",
            value: `${latest.bristolType}`,
            unit: "/7",
            status: evaluation.status,
            caption: fluidTodayL === null ? "No fluid logged today" : `Fluids today ${fluidTodayL} L`,
          },
    fluidTarget: { min: GI_LIMITS.fluidMinL, max: GI_LIMITS.fluidMaxL },
  };
}
