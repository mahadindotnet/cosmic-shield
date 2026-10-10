import thresholds from "@/data/rules/thresholds.json";
import type {
  CrewVitalsSnapshot,
  EscalationLevel,
  EscalationResult,
  ModuleState,
  VitalPoint,
} from "@/lib/rules/types";

function hrDrift(trend: VitalPoint[], days: number, driftBpm: number) {
  if (trend.length < days + 1) return false;
  const recent = trend.slice(-days);
  const first = recent[0]?.value ?? 0;
  const last = recent[recent.length - 1]?.value ?? 0;
  return last - first >= driftBpm;
}

export function evaluateEscalation(input: {
  vitals: CrewVitalsSnapshot;
  hrTrend: VitalPoint[];
  moduleState: ModuleState;
}): EscalationResult {
  const t = thresholds.vitals;
  const reasons: string[] = [];
  const actions: string[] = [];
  let level = "normal" as EscalationLevel;

  const bump = (next: EscalationLevel) => {
    const rank = { normal: 0, watch: 1, escalate: 2 };
    if (rank[next] > rank[level]) level = next;
  };

  if (input.vitals.heartRateBpm >= t.heartRateBpm.watchHigh) {
    reasons.push(
      `Heart rate ${input.vitals.heartRateBpm} bpm above watch threshold (${t.heartRateBpm.watchHigh}).`,
    );
    actions.push("Reduce workload; repeat vitals in 30 min; review cardio countermeasures.");
    bump("watch");
  }

  if (hrDrift(input.hrTrend, thresholds.trends.hrDriftDays, thresholds.trends.hrDriftBpm)) {
    reasons.push(
      `${thresholds.trends.hrDriftDays}-day cardiovascular drift detected (HRP cardio risk pattern).`,
    );
    actions.push("Initiate resistive exercise block; hydrate; schedule flight surgeon review if drift persists.");
    bump("watch");
  }

  if (input.vitals.sleepHours <= t.sleepHours.watchLow) {
    reasons.push(`Sleep ${input.vitals.sleepHours.toFixed(1)} h below watch threshold.`);
    actions.push("Sleep hygiene protocol; adjust workload; behavioral check-in follow-up.");
    bump("watch");
  }

  if (input.vitals.stressIndex >= t.stressIndex.watchHigh) {
    reasons.push(`Stress index ${input.vitals.stressIndex} elevated vs baseline.`);
    actions.push("Guided recovery block; peer check-in; monitor HRV trend.");
    bump("watch");
  }

  if (input.vitals.radiationCumulativeMsv >= t.radiationMsvDay.cumulativeWatchMsv) {
    reasons.push(
      `Cumulative radiation ${input.vitals.radiationCumulativeMsv.toFixed(2)} mSv exceeds watch band.`,
    );
    actions.push("Review shelter/operations schedule; correlate symptoms with dose log (RadLab).");
    bump("watch");
  }

  if (input.vitals.spo2Pct <= t.spo2Pct.watchLow) {
    reasons.push(`SpO₂ ${input.vitals.spo2Pct}% at or below watch threshold.`);
    actions.push("Verify sensor; pulmonary assessment protocol; escalate if sustained.");
    bump("escalate");
  }

  if (input.moduleState.sansConfidence >= thresholds.modules.sansConfidenceEscalate) {
    reasons.push(
      `SANS ocular screening confidence ${(input.moduleState.sansConfidence * 100).toFixed(0)}% — escalate band.`,
    );
    actions.push("Capture repeat fundus image; notify flight surgeon with imaging packet.");
    bump("escalate");
  } else if (input.moduleState.sansConfidence >= thresholds.modules.sansConfidenceWatch) {
    reasons.push("SANS screening in watch band — repeat imaging recommended.");
    actions.push("Schedule repeat ocular capture per HRP SANS monitoring guidance.");
    bump("watch");
  }

  if (thresholds.modules.bristolEscalateTypes.includes(input.moduleState.bristolType)) {
    reasons.push(`Bristol type ${input.moduleState.bristolType} logged — GI symptom escalation pattern.`);
    actions.push("Hydration and nutrition protocol; medical kit guidance; monitor for dehydration.");
    bump("watch");
  }

  const finalLevel: EscalationLevel = level;
  const headline =
    finalLevel === "escalate"
      ? "Escalate — contact flight surgeon with attached evidence"
      : finalLevel === "watch"
        ? "Watch — trend flagged; follow onboard countermeasures"
        : "Nominal — continue monitoring";

  if (finalLevel === "normal") {
    reasons.push("All monitored domains within configured watch thresholds.");
    actions.push("Continue daily vitals, radiation log, and countermeasure compliance.");
  }

  return {
    level: finalLevel,
    headline,
    reasons,
    recommendedActions: actions,
    evidence: {
      vitals: input.vitals,
      sansConfidence: input.moduleState.sansConfidence,
      bristolType: input.moduleState.bristolType,
      hrTrendLast: input.hrTrend.slice(-thresholds.trends.hrDriftDays),
    },
  };
}
