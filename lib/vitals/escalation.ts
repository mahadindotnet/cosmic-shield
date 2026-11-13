import { sourceText, type VitalsEvaluation, type VitalsValues } from "./rules";

export const VITALS_RULE_ID = "vitals";

/** What the crew member is told to do when a reading escalates. */
export const ESCALATE_GUIDANCE =
  "Contact the flight surgeon now. Re-check the reading (sensor seated, at rest) and keep the device on. An evidence record has been sent with this reading.";

export interface EscalationDraft {
  ruleId: typeof VITALS_RULE_ID;
  reason: string;
  evidence: {
    values: VitalsValues;
    status: "escalate";
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
    evidence: { values, status: "escalate", triggered },
  };
}
