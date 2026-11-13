import { addDays, dayLabel, type DailyPoint } from "@/lib/vitals/summary";
import { evaluateMindPattern, type MindDay, type MindEvaluation, type MindStatus } from "./rules";

export interface CheckinRow {
  id: number;
  /** When the check-in was made (ISO UTC). Its UTC date is the check-in day. */
  recordedAt: string;
  source: "manual" | "seed" | "device";
  mood: number;
  stress: number | null;
  sleepQuality: number | null;
  /** Private to the crew member; null in the flight surgeon's view. */
  note: string | null;
}

export interface CheckinHistoryRow extends CheckinRow {
  day: string;
  /** The pattern status as of that day. */
  status: MindStatus;
  /** False when a later check-in the same day replaced this one. */
  current: boolean;
}

export interface MindSummary {
  latest: (CheckinRow & { day: string }) | null;
  /** Pattern as of today. */
  pattern: MindEvaluation;
  history: CheckinHistoryRow[];
  trends: { mood: DailyPoint[]; stress: DailyPoint[] };
  /** Check-ins per UTC day (for the streak). */
  checkinsByDay: Record<string, number>;
  checkedInToday: boolean;
  /** Days with a check-in in the current UTC month. */
  daysThisMonth: number;
  tile: { metric: string; value: string; unit: string; status: MindStatus } | null;
}

const dayOf = (iso: string) => iso.slice(0, 10);
const newestFirst = (a: CheckinRow, b: CheckinRow) => b.recordedAt.localeCompare(a.recordedAt) || b.id - a.id;

/** One entry per day: the latest check-in of that day. */
export function latestPerDay(rows: readonly CheckinRow[]): MindDay[] {
  const byDay = new Map<string, MindDay>();
  for (const r of [...rows].sort(newestFirst)) {
    const day = dayOf(r.recordedAt);
    if (!byDay.has(day)) byDay.set(day, { day, mood: r.mood, stress: r.stress });
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function summarizeMind(rows: readonly CheckinRow[], today: string, days = 14): MindSummary {
  const sorted = [...rows].sort(newestFirst);
  const perDay = latestPerDay(rows);
  const currentIds = new Set<number>();
  const seen = new Set<string>();
  for (const r of sorted) {
    const d = dayOf(r.recordedAt);
    if (!seen.has(d)) {
      seen.add(d);
      currentIds.add(r.id);
    }
  }

  const history = sorted.map((r) => {
    const day = dayOf(r.recordedAt);
    return { ...r, day, status: evaluateMindPattern(perDay, day).status, current: currentIds.has(r.id) };
  });

  const start = addDays(today, -(days - 1));
  const byDay = new Map(perDay.map((d) => [d.day, d]));
  const series = (key: "mood" | "stress"): DailyPoint[] =>
    Array.from({ length: days }, (_, i) => {
      const day = addDays(start, i);
      return { day, label: dayLabel(day), value: byDay.get(day)?.[key] ?? null };
    });

  const checkinsByDay: Record<string, number> = {};
  for (const r of rows) {
    const d = dayOf(r.recordedAt);
    checkinsByDay[d] = (checkinsByDay[d] ?? 0) + 1;
  }

  const latestRow = sorted[0] ?? null;
  const latest = latestRow ? { ...latestRow, day: dayOf(latestRow.recordedAt) } : null;
  const pattern = evaluateMindPattern(perDay, today);
  const month = today.slice(0, 7);

  return {
    latest,
    pattern,
    history,
    trends: { mood: series("mood"), stress: series("stress") },
    checkinsByDay,
    checkedInToday: Boolean(checkinsByDay[today]),
    daysThisMonth: Object.keys(checkinsByDay).filter((d) => d.startsWith(month) && d <= today).length,
    tile: latest
      ? {
          metric: latest.day === today ? "Mood today" : `Mood, ${dayLabel(latest.day)}`,
          value: `${latest.mood}`,
          unit: "/5",
          status: pattern.status,
        }
      : null,
  };
}
