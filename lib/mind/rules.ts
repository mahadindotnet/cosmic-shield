import thresholds from "@/data/rules/thresholds.json";
import { addDays } from "@/lib/vitals/summary";

/**
 * Mind rule `mind_pattern` (app default, Watch only, never Escalate),
 * evaluated on read: Watch when mood is at or below 2 on 3 consecutive days,
 * or stress is at or above 4 on 3 consecutive days. A "day" is a UTC (station
 * time) date and the latest check-in of the day counts. The run must end today
 * or yesterday, so an old run stops counting. Not a screening tool.
 */

export const MIND_PATTERN_ID = "mind_pattern" as const;
export type MindStatus = "normal" | "watch";

const t = thresholds.mind;
export const MIND_LIMITS = {
  lowMoodMax: t.lowMoodMax,
  highStressMin: t.highStressMin,
  consecutiveDays: t.consecutiveDays,
  maxAgeDays: t.maxAgeDays,
} as const;

export interface MindDay {
  /** YYYY-MM-DD (UTC). */
  day: string;
  mood: number;
  stress: number | null;
}

export interface MindEvaluation {
  status: MindStatus;
  /** Which run(s) were found. */
  lowMood: boolean;
  highStress: boolean;
  /** The days in the run, oldest first (empty when Normal). */
  runDays: string[];
  reason?: string;
}

const isLow = (d: MindDay) => d.mood <= MIND_LIMITS.lowMoodMax;
const isHigh = (d: MindDay) => d.stress !== null && d.stress >= MIND_LIMITS.highStressMin;

/** The latest `n` calendar days ending on `end` all match, with a check-in on each. */
function runEndingOn(byDay: Map<string, MindDay>, end: string, match: (d: MindDay) => boolean) {
  const days = Array.from({ length: MIND_LIMITS.consecutiveDays }, (_, i) => addDays(end, -(MIND_LIMITS.consecutiveDays - 1 - i)));
  return days.every((d) => {
    const x = byDay.get(d);
    return Boolean(x && match(x));
  })
    ? days
    : null;
}

/**
 * Evaluates the pattern as of `asOf` (YYYY-MM-DD). `days` holds one entry per
 * day (latest check-in of the day), any order.
 */
export function evaluateMindPattern(days: readonly MindDay[], asOf: string): MindEvaluation {
  const byDay = new Map(days.filter((d) => d.day <= asOf).map((d) => [d.day, d]));
  const latest = [...byDay.keys()].sort().at(-1);
  const normal: MindEvaluation = { status: "normal", lowMood: false, highStress: false, runDays: [] };
  if (!latest || latest < addDays(asOf, -MIND_LIMITS.maxAgeDays)) return normal;

  const low = runEndingOn(byDay, latest, isLow);
  const high = runEndingOn(byDay, latest, isHigh);
  if (!low && !high) return normal;

  const n = MIND_LIMITS.consecutiveDays;
  const parts = [
    low ? `mood was ${MIND_LIMITS.lowMoodMax}/5 or lower` : null,
    high ? `stress was ${MIND_LIMITS.highStressMin}/5 or higher` : null,
  ].filter(Boolean);
  return {
    status: "watch",
    lowMood: Boolean(low),
    highStress: Boolean(high),
    runDays: (low ?? high)!,
    reason: `Over the last ${n} days in a row, ${parts.join(" and ")}.`,
  };
}
