import thresholds from "@/data/rules/thresholds.json";
import { getMissionEnvironment, type MissionEnvironmentId } from "@/lib/mission/environments";
import { addDays } from "@/lib/vitals/summary";

/**
 * Bone protection rules (pure). All targets are app defaults: none has a
 * verified source (thresholds.json `bone`, docs/rules.md).
 *
 * Rule `bone_exercise` (Watch only): over the last 7 days ending today, if
 * anything was logged, total exercise below 50 % of the weekly target
 * (7 × the environment's daily target) is Watch. Calcium and vitamin D are
 * shown against their daily targets but never raise a status.
 */

export const BONE_EXERCISE_ID = "bone_exercise" as const;
export type BoneStatus = "normal" | "watch" | "no-data";

const b = thresholds.bone;
export const BONE_LIMITS = {
  defaultDailyExerciseMin: b.defaultDailyExerciseMin,
  calciumMgPerDay: b.calciumMgPerDay,
  vitaminDIuPerDay: b.vitaminDIuPerDay,
  windowDays: b.windowDays,
  weeklyWatchFraction: b.weeklyWatchFraction,
} as const;

/** The daily exercise target for an environment (app default), and whether it came from the environment. */
export function dailyExerciseTarget(environment: string | null) {
  const env = getMissionEnvironment((environment as MissionEnvironmentId | null) ?? null);
  return env
    ? { minutes: env.exerciseTargetMin, environmentName: env.name as string | null }
    : { minutes: BONE_LIMITS.defaultDailyExerciseMin, environmentName: null };
}

/** Totals for one UTC day. */
export interface BoneDay {
  day: string;
  aerobicMinutes: number;
  resistanceMinutes: number;
  /** aerobic + resistance. */
  totalMinutes: number;
  /** Σ kg × reps over the day's entries that have both. */
  volumeKg: number;
  /** Heaviest load logged that day, kg (null if none). */
  peakLoadKg: number | null;
  calciumMg: number;
  vitaminDIu: number;
}

export interface WeekEvaluation {
  status: BoneStatus;
  /** Exercise minutes in the 7 days ending today. */
  totalMinutes: number;
  targetMinutes: number;
  /** % of the weekly target. */
  pct: number;
  daysLogged: number;
  reason?: string;
}

export function evaluateWeek(days: readonly BoneDay[], today: string, dailyTargetMin: number): WeekEvaluation {
  const start = addDays(today, -(BONE_LIMITS.windowDays - 1));
  const inWindow = days.filter((d) => d.day >= start && d.day <= today);
  const totalMinutes = inWindow.reduce((s, d) => s + d.totalMinutes, 0);
  const targetMinutes = dailyTargetMin * BONE_LIMITS.windowDays;
  const pct = targetMinutes ? Math.round((totalMinutes / targetMinutes) * 100) : 0;
  const base = { totalMinutes, targetMinutes, pct, daysLogged: inWindow.length };
  if (!inWindow.length) return { ...base, status: "no-data" };
  if (totalMinutes < targetMinutes * BONE_LIMITS.weeklyWatchFraction)
    return {
      ...base,
      status: "watch",
      reason: `Exercise over the last ${BONE_LIMITS.windowDays} days is ${totalMinutes} min, below half the weekly target (${targetMinutes} min).`,
    };
  return { ...base, status: "normal" };
}

/** What kind of session an entry is, from its minutes and load. */
export function sessionKind(x: { aerobicMinutes: number; resistanceMinutes: number; loadKg: number | null }) {
  const resistive = x.resistanceMinutes > 0 || (x.loadKg ?? 0) > 0;
  if (x.aerobicMinutes > 0 && resistive) return "mixed" as const;
  if (resistive) return "resistive" as const;
  if (x.aerobicMinutes > 0) return "aerobic" as const;
  return "none" as const;
}
