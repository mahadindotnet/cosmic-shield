import thresholds from "@/data/rules/thresholds.json";
import { getMissionEnvironment, type MissionEnvironmentId } from "@/lib/mission/environments";

/**
 * Radiation rules, evaluated on read (statuses are never stored).
 *
 * - Each dosimeter reading is turned into a daily rate (mSv/day) and checked
 *   against the Watch level of the environment it was taken in: 2 × that
 *   environment's typical daily dose (app default). Readings without an
 *   environment use the ISS-based default (thresholds.json, app default).
 * - The career total is the sum of every dose entry. Watch from 300 mSv (half
 *   the limit, app default); Escalate above the 600 mSv career limit
 *   (NASA-STD-3001, sourced).
 */

export type DoseStatus = "normal" | "watch";
export type CareerStatus = "normal" | "watch" | "escalate";

const r = thresholds.vitals.radiationMsvDay;
export const RADIATION_LIMITS = {
  /** mSv/day; app default for readings with no environment (2 × ISS ALTEA dose). */
  defaultDailyWatch: r.watchHigh,
  /** mSv; app default, half the career limit. */
  careerWatch: r.cumulativeWatchMsv,
  /** mSv; sourced, NASA-STD-3001 Volume 1. */
  careerLimit: r.careerLimitMsv,
  careerLimitSource: r.careerLimitSource,
} as const;

export interface DoseValues {
  /** Dose equivalent for the period, mSv. */
  doseMsv: number;
  /** Hours the reading covers. */
  periodHours: number;
  /** Mission environment the reading was taken in. */
  environment: string | null;
}

export const round = (x: number, places = 3) => Math.round(x * 10 ** places) / 10 ** places;

/** mSv/day for a reading. */
export const dailyRate = (doseMsv: number, periodHours: number) => round((doseMsv * 24) / periodHours);

/** Daily-rate Watch level for an environment (falls back to the default). */
export function dailyWatchFor(environment: string | null) {
  const env = getMissionEnvironment((environment as MissionEnvironmentId) ?? null);
  return {
    level: env?.radiationWatchMsvPerDay ?? RADIATION_LIMITS.defaultDailyWatch,
    environmentName: env?.name ?? null,
  };
}

export interface DoseEvaluation {
  status: DoseStatus;
  rate: number;
  watchLevel: number;
  reason?: string;
}

export function evaluateDose(x: DoseValues): DoseEvaluation {
  const rate = dailyRate(x.doseMsv, x.periodHours);
  const { level, environmentName } = dailyWatchFor(x.environment);
  const where = environmentName ? ` for ${environmentName}` : "";
  return rate >= level
    ? { status: "watch", rate, watchLevel: level, reason: `Dose rate ${rate} mSv/d is at or above the Watch level${where} (${level} mSv/d).` }
    : { status: "normal", rate, watchLevel: level };
}

export interface CareerEvaluation {
  status: CareerStatus;
  totalMsv: number;
  /** Share of the 600 mSv career limit, %. */
  pctOfLimit: number;
  reason?: string;
}

export function evaluateCareer(totalMsv: number): CareerEvaluation {
  const total = round(totalMsv, 2);
  const pctOfLimit = round((total / RADIATION_LIMITS.careerLimit) * 100, 1);
  if (total > RADIATION_LIMITS.careerLimit)
    return {
      status: "escalate",
      totalMsv: total,
      pctOfLimit,
      reason: `Career dose ${total} mSv is above the ${RADIATION_LIMITS.careerLimit} mSv career limit (NASA-STD-3001).`,
    };
  if (total >= RADIATION_LIMITS.careerWatch)
    return {
      status: "watch",
      totalMsv: total,
      pctOfLimit,
      reason: `Career dose ${total} mSv is at or above the Watch level (${RADIATION_LIMITS.careerWatch} mSv, half the career limit).`,
    };
  return { status: "normal", totalMsv: total, pctOfLimit };
}
