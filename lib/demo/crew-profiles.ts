import { getMissionConfig, getDefaultNasaSourceTags } from "@/lib/nasa/loaders";
import { evaluateEscalation } from "@/lib/rules/engine";
import type { CrewDashboardPayload, ModuleState, VitalPoint } from "@/lib/rules/types";

function series(base: number, drift: number, days = 14): VitalPoint[] {
  return Array.from({ length: days }, (_, i) => ({
    missionDay: 29 + i,
    value: Math.round((base + (drift * i) / days + Math.sin(i) * 0.8) * 10) / 10,
  }));
}

function radiationSeries(scale = 1): VitalPoint[] {
  const cfg = getMissionConfig();
  return cfg.missionDay
    ? Array.from({ length: 14 }, (_, i) => ({
        missionDay: 29 + i,
        value: Math.round((0.12 + i * 0.008) * scale * 1000) / 1000,
      }))
    : [];
}

function buildPayload(
  id: string,
  name: string,
  role: string,
  vitals: CrewDashboardPayload["vitals"],
  hrTrend: VitalPoint[],
  hrvTrend: VitalPoint[],
  sleepTrend: VitalPoint[],
  moduleState: ModuleState,
  behavioralLog: CrewDashboardPayload["behavioralLog"],
): CrewDashboardPayload {
  const cfg = getMissionConfig();
  const radiationTrend = radiationSeries(id === "reyes" ? 1.05 : 1);
  const escalation = evaluateEscalation({ vitals, hrTrend, moduleState });
  return {
    id,
    name,
    role,
    missionDay: cfg.missionDay,
    commsDelayMinutes: cfg.commsDelayMinutes,
    vitals,
    hrTrend,
    hrvTrend,
    radiationTrend,
    sleepTrend,
    moduleState,
    escalation,
    behavioralLog,
    nasaSources: getDefaultNasaSourceTags(),
  };
}

const CREW: Record<string, CrewDashboardPayload> = {
  reyes: buildPayload(
    "reyes",
    "Cmdr. Elena Reyes",
    "Commander",
    {
      heartRateBpm: 92,
      hrvMs: 31,
      spo2Pct: 96,
      systolicBp: 128,
      diastolicBp: 78,
      sleepHours: 6.8,
      stressIndex: 48,
      radiationDoseMsvDay: 0.21,
      radiationCumulativeMsv: 8.9,
    },
    series(74, 14),
    series(40, -6),
    series(7.1, -0.8),
    {
      bristolType: 4,
      sansConfidence: 0.61,
      sansStatus: "nominal",
      giStatus: "nominal",
      hydrationLiters: 1.4,
      hydrationTargetLiters: 2,
      exerciseCompliancePct: 82,
    },
    [{ at: "MET 041:12", affectScore: 3, note: "Focused; mild fatigue after EVA prep." }],
  ),
  okafor: buildPayload(
    "okafor",
    "Dr. Amara Okafor",
    "Flight Surgeon",
    {
      heartRateBpm: 78,
      hrvMs: 29,
      spo2Pct: 97,
      systolicBp: 122,
      diastolicBp: 76,
      sleepHours: 5.2,
      stressIndex: 68,
      radiationDoseMsvDay: 0.19,
      radiationCumulativeMsv: 8.2,
    },
    series(70, 4),
    series(38, -4),
    series(6.8, -1.6),
    {
      bristolType: 3,
      sansConfidence: 0.58,
      sansStatus: "nominal",
      giStatus: "nominal",
      hydrationLiters: 1.1,
      hydrationTargetLiters: 2,
      exerciseCompliancePct: 64,
    },
    [
      { at: "MET 041:08", affectScore: 2, note: "Sleep debt; requests workload adjustment." },
      { at: "MET 040:22", affectScore: 3, note: "Stable mood; elevated task load." },
    ],
  ),
  lindqvist: buildPayload(
    "lindqvist",
    "Lt. Sven Lindqvist",
    "Systems",
    {
      heartRateBpm: 66,
      hrvMs: 44,
      spo2Pct: 98,
      systolicBp: 114,
      diastolicBp: 70,
      sleepHours: 7.4,
      stressIndex: 28,
      radiationDoseMsvDay: 0.17,
      radiationCumulativeMsv: 7.6,
    },
    series(64, 1),
    series(43, 1),
    series(7.3, 0.2),
    {
      bristolType: 4,
      sansConfidence: 0.52,
      sansStatus: "nominal",
      giStatus: "nominal",
      hydrationLiters: 1.9,
      hydrationTargetLiters: 2,
      exerciseCompliancePct: 91,
    },
    [{ at: "MET 041:05", affectScore: 4, note: "Nominal affect; good team cohesion." }],
  ),
  tanaka: buildPayload(
    "tanaka",
    "Spec. Kenji Tanaka",
    "Payload",
    {
      heartRateBpm: 71,
      hrvMs: 41,
      spo2Pct: 97,
      systolicBp: 116,
      diastolicBp: 71,
      sleepHours: 7,
      stressIndex: 34,
      radiationDoseMsvDay: 0.18,
      radiationCumulativeMsv: 7.9,
    },
    series(68, 2),
    series(42, 0),
    series(7, -0.1),
    {
      bristolType: 6,
      sansConfidence: 0.55,
      sansStatus: "nominal",
      giStatus: "logged",
      hydrationLiters: 1.6,
      hydrationTargetLiters: 2,
      exerciseCompliancePct: 88,
    },
    [{ at: "MET 041:00", affectScore: 3, note: "GI log submitted; no systemic symptoms reported." }],
  ),
};

export const CREW_IDS = Object.keys(CREW);

export function getCrewDashboard(crewId: string): CrewDashboardPayload | null {
  return CREW[crewId] ?? null;
}

export function listCrewSummaries() {
  return CREW_IDS.map((id) => {
    const c = CREW[id];
    return { id, name: c.name, role: c.role, escalationLevel: c.escalation.level };
  });
}

export function getAllCrewDashboards() {
  return CREW;
}
