export type EscalationLevel = "normal" | "watch" | "escalate";

export type VitalMetric =
  | "heart_rate"
  | "hrv"
  | "spo2"
  | "systolic_bp"
  | "diastolic_bp"
  | "sleep_hours"
  | "stress_index"
  | "radiation_dose";

export interface VitalPoint {
  missionDay: number;
  value: number;
}

export interface CrewVitalsSnapshot {
  heartRateBpm: number;
  hrvMs: number;
  spo2Pct: number;
  systolicBp: number;
  diastolicBp: number;
  sleepHours: number;
  stressIndex: number;
  radiationDoseMsvDay: number;
  radiationCumulativeMsv: number;
}

export interface ModuleState {
  bristolType: number;
  sansConfidence: number;
  sansStatus: "nominal" | "watch" | "escalate";
  giStatus: "nominal" | "logged";
  hydrationLiters: number;
  hydrationTargetLiters: number;
  exerciseCompliancePct: number;
}

export interface EscalationResult {
  level: EscalationLevel;
  headline: string;
  reasons: string[];
  recommendedActions: string[];
  evidence: Record<string, unknown>;
}

export interface CrewDashboardPayload {
  id: string;
  name: string;
  role: string;
  missionDay: number;
  commsDelayMinutes: number;
  vitals: CrewVitalsSnapshot;
  hrTrend: VitalPoint[];
  hrvTrend: VitalPoint[];
  radiationTrend: VitalPoint[];
  sleepTrend: VitalPoint[];
  moduleState: ModuleState;
  escalation: EscalationResult;
  behavioralLog: { at: string; affectScore: number; note: string }[];
  nasaSources: { module: string; source: string }[];
}
