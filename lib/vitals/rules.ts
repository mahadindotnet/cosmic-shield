import thresholds from "@/data/rules/thresholds.json";

/**
 * Vitals rules, evaluated on read (statuses are never stored). Each measure
 * has a list of limits from data/rules/thresholds.json. Every limit is
 * labelled: "sourced" (cited in thresholds.json `sources` and docs/rules.md)
 * or "app default". The reading's status is the worst of its measures.
 *
 * Escalate limits exist only where a source was confirmed: SpO₂ < 90 % (WHO),
 * glucose < 54 mg/dL (ADA level 2) and blood pressure > 180 systolic or
 * > 120 diastolic (AHA "hypertensive crisis"). Heart rate is Watch only.
 */

export type VitalsStatus = "normal" | "watch" | "escalate";

export interface VitalsValues {
  heartRate: number;
  systolic: number;
  diastolic: number;
  spo2: number;
  glucose: number | null;
}

export type VitalsMeasure = "heartRate" | "bloodPressure" | "spo2" | "glucose";

type Op = "<" | "<=" | ">=" | ">";

export interface Limit {
  level: Exclude<VitalsStatus, "normal">;
  op: Op;
  value: number;
  basis: "sourced" | "app default";
  /** Key in thresholds.json `sources` when sourced. */
  source?: string;
}

export interface TriggeredLimit extends Limit {
  name: string;
  measured: number;
  unit: string;
}

export interface MeasureCheck {
  measure: VitalsMeasure;
  label: string;
  /** Display value, e.g. "150/95". */
  display: string;
  unit: string;
  status: VitalsStatus;
  /** Why it is not Normal (plain words); undefined when Normal. */
  reason?: string;
  /** The limits this measure crossed (worst first). */
  triggered: TriggeredLimit[];
}

export interface VitalsEvaluation {
  status: VitalsStatus;
  checks: MeasureCheck[];
  /** The flagged measures' reasons, worst first. Empty when Normal. */
  reasons: string[];
}

const v = thresholds.vitals;
const SRC = thresholds.sources as Record<string, string>;
const DEFAULT = "app default" as const;

/** Limits per measured value. Inclusive app-default Watch bounds match the drawn bands. */
export const VITALS_LIMITS: Record<"heartRate" | "systolic" | "diastolic" | "spo2" | "glucose", Limit[]> = {
  heartRate: [
    { level: "watch", op: ">=", value: v.heartRateBpm.watchHigh, basis: DEFAULT },
    { level: "watch", op: "<=", value: v.heartRateBpm.watchLow, basis: DEFAULT },
  ],
  systolic: [
    { level: "escalate", op: ">", value: v.bloodPressureEscalate.systolicAbove, basis: "sourced", source: v.bloodPressureEscalate.source },
    { level: "watch", op: ">=", value: v.systolicBp.watchHigh, basis: DEFAULT },
    { level: "watch", op: "<=", value: v.systolicBp.watchLow, basis: DEFAULT },
  ],
  diastolic: [
    { level: "escalate", op: ">", value: v.bloodPressureEscalate.diastolicAbove, basis: "sourced", source: v.bloodPressureEscalate.source },
    { level: "watch", op: ">=", value: v.diastolicBp.watchHigh, basis: DEFAULT },
  ],
  spo2: [
    { level: "escalate", op: "<", value: v.spo2Pct.escalateBelow, basis: "sourced", source: v.spo2Pct.escalateSource },
    { level: "watch", op: "<=", value: v.spo2Pct.watchLow, basis: DEFAULT },
  ],
  glucose: [
    { level: "escalate", op: "<", value: v.glucoseMgDl.escalateBelow, basis: "sourced", source: v.glucoseMgDl.escalateSource },
    { level: "watch", op: "<", value: v.glucoseMgDl.watchBelow, basis: "sourced", source: v.glucoseMgDl.watchBelowSource },
    { level: "watch", op: ">=", value: v.glucoseMgDl.watchHigh, basis: DEFAULT },
  ],
};

// Every sourced limit must point at a real citation.
for (const limits of Object.values(VITALS_LIMITS)) {
  for (const l of limits) {
    if (l.basis === "sourced" && !(l.source && SRC[l.source])) throw new Error(`Missing source for vitals limit ${l.op} ${l.value}`);
  }
}

const RANK: Record<VitalsStatus, number> = { normal: 0, watch: 1, escalate: 2 };
const worst = (a: VitalsStatus, b: VitalsStatus) => (RANK[b] > RANK[a] ? b : a);

const test = (x: number, l: Limit) =>
  l.op === "<" ? x < l.value : l.op === "<=" ? x <= l.value : l.op === ">=" ? x >= l.value : x > l.value;

const PHRASE: Record<Op, string> = { "<": "below", "<=": "at or below", ">=": "at or above", ">": "above" };
const LEVEL: Record<Limit["level"], string> = { watch: "Watch", escalate: "Escalate" };

/** The first (worst) limit crossed by one value, as a triggered limit. */
function firstCrossed(name: string, value: number, unit: string, limits: Limit[]): TriggeredLimit[] {
  const hit = [...limits].sort((a, b) => RANK[b.level] - RANK[a.level]).find((l) => test(value, l));
  return hit ? [{ ...hit, name, measured: value, unit }] : [];
}

const sentence = (t: TriggeredLimit) =>
  `${t.name} ${t.measured} ${t.unit} is ${PHRASE[t.op]} the ${LEVEL[t.level]} level (${t.value} ${t.unit}).`;

export function evaluateVitals(x: VitalsValues): VitalsEvaluation {
  const check = (measure: VitalsMeasure, label: string, display: string, unit: string, triggered: TriggeredLimit[]): MeasureCheck => {
    const sorted = [...triggered].sort((a, b) => RANK[b.level] - RANK[a.level]);
    const status = sorted.reduce<VitalsStatus>((s, t) => worst(s, t.level), "normal");
    return { measure, label, display, unit, status, triggered: sorted, reason: sorted.length ? sorted.map(sentence).join(" ") : undefined };
  };

  const checks: MeasureCheck[] = [
    check("heartRate", "Heart rate", `${x.heartRate}`, "bpm", firstCrossed("Heart rate", x.heartRate, "bpm", VITALS_LIMITS.heartRate)),
    check("bloodPressure", "Blood pressure", `${x.systolic}/${x.diastolic}`, "mmHg", [
      ...firstCrossed("Systolic", x.systolic, "mmHg", VITALS_LIMITS.systolic),
      ...firstCrossed("Diastolic", x.diastolic, "mmHg", VITALS_LIMITS.diastolic),
    ]),
    check("spo2", "SpO₂", `${x.spo2}`, "%", firstCrossed("SpO₂", x.spo2, "%", VITALS_LIMITS.spo2)),
  ];
  if (x.glucose !== null) {
    checks.push(check("glucose", "Glucose", `${x.glucose}`, "mg/dL", firstCrossed("Glucose", x.glucose, "mg/dL", VITALS_LIMITS.glucose)));
  }

  const flagged = checks.filter((c) => c.status !== "normal").sort((a, b) => RANK[b.status] - RANK[a.status]);
  return {
    status: checks.reduce<VitalsStatus>((s, c) => worst(s, c.status), "normal"),
    checks,
    reasons: flagged.map((c) => c.reason!),
  };
}

/** Citation text for a source key (for evidence packets and the UI). */
export const sourceText = (key: string | undefined) => (key ? SRC[key] : undefined);
