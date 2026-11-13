import thresholds from "@/data/rules/thresholds.json";

/**
 * Vitals rules, evaluated on read (statuses are never stored). A value at or
 * beyond a Watch bound in data/rules/thresholds.json raises Watch for that
 * measure; the reading's status is the worst of its measures. All bounds are
 * app defaults (see docs/rules.md). Vitals rules never raise Escalate.
 */

export type VitalsStatus = "normal" | "watch";

export interface VitalsValues {
  heartRate: number;
  systolic: number;
  diastolic: number;
  spo2: number;
  glucose: number | null;
}

export type VitalsMeasure = "heartRate" | "bloodPressure" | "spo2" | "glucose";

export interface MeasureCheck {
  measure: VitalsMeasure;
  label: string;
  /** Display value, e.g. "150/95". */
  display: string;
  unit: string;
  status: VitalsStatus;
  /** Why it is Watch (plain words); undefined when Normal. */
  reason?: string;
}

export interface VitalsEvaluation {
  status: VitalsStatus;
  checks: MeasureCheck[];
  /** The flagged measures' reasons. Empty when Normal. */
  reasons: string[];
}

const t = thresholds.vitals;

/** Watch bounds per measure (inclusive). */
export const VITALS_BOUNDS = {
  heartRate: { low: t.heartRateBpm.watchLow, high: t.heartRateBpm.watchHigh },
  systolic: { low: t.systolicBp.watchLow, high: t.systolicBp.watchHigh },
  diastolic: { low: null, high: t.diastolicBp.watchHigh },
  spo2: { low: t.spo2Pct.watchLow, high: null },
  glucose: { low: t.glucoseMgDl.watchLow, high: t.glucoseMgDl.watchHigh },
} as const satisfies Record<string, { low: number | null; high: number | null }>;

function bound(value: number, b: { low: number | null; high: number | null }, name: string, unit: string) {
  if (b.high !== null && value >= b.high) return `${name} ${value} ${unit} is at or above the Watch level (${b.high} ${unit}).`;
  if (b.low !== null && value <= b.low) return `${name} ${value} ${unit} is at or below the Watch level (${b.low} ${unit}).`;
  return undefined;
}

export function evaluateVitals(v: VitalsValues): VitalsEvaluation {
  const check = (measure: VitalsMeasure, label: string, display: string, unit: string, reasons: (string | undefined)[]): MeasureCheck => {
    const found = reasons.filter((r): r is string => Boolean(r));
    return { measure, label, display, unit, status: found.length ? "watch" : "normal", reason: found.length ? found.join(" ") : undefined };
  };

  const checks: MeasureCheck[] = [
    check("heartRate", "Heart rate", `${v.heartRate}`, "bpm", [bound(v.heartRate, VITALS_BOUNDS.heartRate, "Heart rate", "bpm")]),
    check("bloodPressure", "Blood pressure", `${v.systolic}/${v.diastolic}`, "mmHg", [
      bound(v.systolic, VITALS_BOUNDS.systolic, "Systolic", "mmHg"),
      bound(v.diastolic, VITALS_BOUNDS.diastolic, "Diastolic", "mmHg"),
    ]),
    check("spo2", "SpO₂", `${v.spo2}`, "%", [bound(v.spo2, VITALS_BOUNDS.spo2, "SpO₂", "%")]),
  ];
  if (v.glucose !== null) {
    checks.push(check("glucose", "Glucose", `${v.glucose}`, "mg/dL", [bound(v.glucose, VITALS_BOUNDS.glucose, "Glucose", "mg/dL")]));
  }

  const flagged = checks.filter((c) => c.status === "watch");
  return {
    status: flagged.length ? "watch" : "normal",
    checks,
    reasons: flagged.map((c) => c.reason!),
  };
}
