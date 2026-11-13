import { addDays, dayLabel, type DailyPoint } from "@/lib/vitals/summary";
import { BONE_LIMITS, evaluateWeek, type BoneDay, type BoneStatus, type WeekEvaluation } from "./rules";

export interface BoneRow {
  id: number;
  /** ISO UTC; its date is the day the log covers. */
  recordedAt: string;
  source: "manual" | "seed" | "device";
  aerobicMinutes: number | null;
  resistanceMinutes: number | null;
  minutes: number;
  loadKg: number | null;
  reps: number | null;
  calciumMg: number | null;
  vitaminDIu: number | null;
  note: string | null;
}

export interface BoneSummary {
  /** Today's totals (zeros when nothing logged today). */
  today: BoneDay;
  loggedToday: boolean;
  week: WeekEvaluation;
  dailyTargetMin: number;
  /** One row per log entry, newest first, with its day. */
  history: (BoneRow & { day: string })[];
  /** Per-day totals, oldest first, `days` long, ending today. */
  trends: { exercise: DailyPoint[]; calcium: DailyPoint[]; vitaminD: DailyPoint[] };
  /** Health Dashboard tile: exercise today and the weekly status. */
  tile: { metric: string; value: string; unit: string; status: Exclude<BoneStatus, "no-data"> } | null;
  targets: { calciumMgPerDay: number; vitaminDIuPerDay: number };
}

const dayOf = (iso: string) => iso.slice(0, 10);
const emptyDay = (day: string): BoneDay => ({
  day,
  aerobicMinutes: 0,
  resistanceMinutes: 0,
  totalMinutes: 0,
  volumeKg: 0,
  peakLoadKg: null,
  calciumMg: 0,
  vitaminDIu: 0,
});

/** Sums every entry of each UTC day (several logs a day add up). */
export function boneDays(rows: readonly BoneRow[]): BoneDay[] {
  const byDay = new Map<string, BoneDay>();
  for (const r of rows) {
    const day = dayOf(r.recordedAt);
    const d = byDay.get(day) ?? emptyDay(day);
    d.aerobicMinutes += r.aerobicMinutes ?? 0;
    d.resistanceMinutes += r.resistanceMinutes ?? 0;
    d.totalMinutes += r.minutes;
    if (r.loadKg !== null && r.reps !== null) d.volumeKg += r.loadKg * r.reps;
    if (r.loadKg !== null) d.peakLoadKg = Math.max(d.peakLoadKg ?? 0, r.loadKg);
    d.calciumMg += r.calciumMg ?? 0;
    d.vitaminDIu += r.vitaminDIu ?? 0;
    byDay.set(day, d);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function summarizeBone(rows: readonly BoneRow[], today: string, dailyTargetMin: number, days = 14): BoneSummary {
  const perDay = boneDays(rows);
  const byDay = new Map(perDay.map((d) => [d.day, d]));
  const start = addDays(today, -(days - 1));
  const series = (pick: (d: BoneDay) => number): DailyPoint[] =>
    Array.from({ length: days }, (_, i) => {
      const day = addDays(start, i);
      const d = byDay.get(day);
      return { day, label: dayLabel(day), value: d ? pick(d) : null };
    });

  const week = evaluateWeek(perDay, today, dailyTargetMin);
  const todayTotals = byDay.get(today) ?? emptyDay(today);
  const loggedToday = byDay.has(today);
  const history = [...rows]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id - a.id)
    .map((r) => ({ ...r, day: dayOf(r.recordedAt) }));

  return {
    today: todayTotals,
    loggedToday,
    week,
    dailyTargetMin,
    history,
    trends: { exercise: series((d) => d.totalMinutes), calcium: series((d) => d.calciumMg), vitaminD: series((d) => d.vitaminDIu) },
    tile:
      week.status === "no-data"
        ? null
        : { metric: "Exercise today", value: `${todayTotals.totalMinutes}`, unit: "min", status: week.status },
    targets: { calciumMgPerDay: BONE_LIMITS.calciumMgPerDay, vitaminDIuPerDay: BONE_LIMITS.vitaminDIuPerDay },
  };
}
