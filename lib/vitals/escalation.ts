import { sourceText, type VitalsEvaluation, type VitalsMeasure, type VitalsValues } from "./rules";

export const VITALS_RULE_ID = "vitals";

/**
 * What the crew member is told to do, per escalating measure. Blood pressure
 * follows the AHA chart's own steps ("Wait five minutes after your first
 * reading. Take your blood pressure again. If your readings are still
 * unusually high, contact your health care professional immediately."), with
 * "health care professional" meaning the flight surgeon / Crew Medical Officer.
 */
export const ESCALATE_GUIDANCE: Record<VitalsMeasure, string> = {
  bloodPressure:
    "Rest, wait 5 minutes and re-measure. If it is still above 180/120, contact the flight surgeon now (or the Crew Medical Officer if the ground is out of contact).",
  spo2: "Contact the flight surgeon now. Re-check with the sensor seated and at rest, and keep the device on.",
  glucose: "Contact the flight surgeon now. Re-check the glucose reading and follow the onboard hypoglycaemia procedure.",
  heartRate: "Contact the flight surgeon now.",
};

/** Guidance lines for an evaluation, one per escalating measure (worst first). */
export function escalateGuidance(evaluation: VitalsEvaluation): string[] {
  return evaluation.checks.filter((c) => c.status === "escalate").map((c) => ESCALATE_GUIDANCE[c.measure]);
}

/** True when blood pressure is the only escalating measure (the re-measure step comes first). */
export const remeasureFirst = (evaluation: VitalsEvaluation) =>
  evaluation.checks.filter((c) => c.status === "escalate").every((c) => c.measure === "bloodPressure");

export interface EscalationDraft {
  ruleId: typeof VITALS_RULE_ID;
  reason: string;
  guidance: string[];
  evidence: {
    values: VitalsValues;
    status: "escalate";
    guidance: string[];
    triggered: {
      measure: string;
      level: string;
      rule: string;
      measured: number;
      unit: string;
      basis: string;
      source?: string;
      citation?: string;
    }[];
  };
}

/** The escalation record for a reading, or null when it isn't Escalate. Pure. */
export function vitalsEscalation(values: VitalsValues, evaluation: VitalsEvaluation): EscalationDraft | null {
  if (evaluation.status !== "escalate") return null;
  const triggered = evaluation.checks.flatMap((c) =>
    c.triggered.map((t) => ({
      measure: c.measure,
      level: t.level,
      rule: `${t.name} ${t.op} ${t.value} ${t.unit}`,
      measured: t.measured,
      unit: t.unit,
      basis: t.basis,
      source: t.source,
      citation: sourceText(t.source),
    })),
  );
  return {
    ruleId: VITALS_RULE_ID,
    reason: evaluation.reasons.join(" "),
    guidance: escalateGuidance(evaluation),
    evidence: { values, status: "escalate", triggered, guidance: escalateGuidance(evaluation) },
  };
}
