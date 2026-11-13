import thresholds from "@/data/rules/thresholds.json";

/**
 * Per-night Sleep & Stress rules, evaluated on read (statuses are never
 * stored). All limits are app defaults in data/rules/thresholds.json; none
 * escalates. The multi-night pattern (HRV and sleep below the person's own
 * baseline) is the separate early-warning rule `hrv_sleep_decline`.
 */

export type SleepStatus = "normal" | "watch";

export interface SleepValues {
  sleepHours: number;
  /** Self-rated 1 (poor) – 5 (great). */
  quality: number | null;
  /** HRV as RMSSD, ms. */
  hrvRmssd: number | null;
  /** Self-rated 1 (calm) – 5 (overwhelmed). */
  stress: number | null;
}

export type SleepMeasure = "sleepHours" | "hrv" | "stress";

export interface SleepCheck {
  measure: SleepMeasure;
  label: string;
  display: string;
  unit: string;
  status: SleepStatus;
  reason?: string;
}

export interface SleepEvaluation {
  status: SleepStatus;
  checks: SleepCheck[];
  reasons: string[];
}

const v = thresholds.vitals;
export const SLEEP_LIMITS = {
  /** Watch at or below (app default). */
  sleepHoursWatchLow: v.sleepHours.watchLow,
  /** Watch at or below (app default population floor). */
  hrvWatchLow: v.hrvMs.watchLow,
  /** Watch at or above on the 1–5 scale (app default). */
  stressWatchHigh: v.selfRatedStress.watchHigh,
} as const;

export function evaluateSleep(x: SleepValues): SleepEvaluation {
  const checks: SleepCheck[] = [];
  const add = (measure: SleepMeasure, label: string, display: string, unit: string, reason: string | undefined) =>
    checks.push({ measure, label, display, unit, status: reason ? "watch" : "normal", reason });

  add(
    "sleepHours",
    "Sleep",
    `${x.sleepHours}`,
    "h",
    x.sleepHours <= SLEEP_LIMITS.sleepHoursWatchLow
      ? `Sleep ${x.sleepHours} h is at or below the Watch level (${SLEEP_LIMITS.sleepHoursWatchLow} h).`
      : undefined,
  );
  if (x.hrvRmssd !== null) {
    add(
      "hrv",
      "HRV",
      `${x.hrvRmssd}`,
      "ms",
      x.hrvRmssd <= SLEEP_LIMITS.hrvWatchLow
        ? `HRV ${x.hrvRmssd} ms is at or below the Watch level (${SLEEP_LIMITS.hrvWatchLow} ms).`
        : undefined,
    );
  }
  if (x.stress !== null) {
    add(
      "stress",
      "Stress",
      `${x.stress}`,
      "/5",
      x.stress >= SLEEP_LIMITS.stressWatchHigh
        ? `Stress ${x.stress}/5 is at or above the Watch level (${SLEEP_LIMITS.stressWatchHigh}/5).`
        : undefined,
    );
  }
  const reasons = checks.flatMap((c) => (c.reason ? [c.reason] : []));
  return { status: reasons.length ? "watch" : "normal", checks, reasons };
}
