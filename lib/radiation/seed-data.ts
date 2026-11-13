import { radiationReference } from "@/lib/nasa/radiation";
import { addDays } from "@/lib/vitals/summary";
import { round } from "./rules";

export interface SeedDose {
  recordedAt: string;
  doseMsv: number;
  periodHours: number;
  environment: string;
  note: string | null;
}

/**
 * Career dose from previous missions per demo crew member (fictional demo
 * values), stored as one summary entry each. Everyone stays below the 300 mSv
 * Watch level, so the seed never raises a status on its own.
 */
const PRIOR_MISSION_MSV = [118, 64, 0, 215];

/**
 * Deterministic demo dosimeter readings: one 24-hour reading (06:00 UTC) on
 * each of the `days` days before `today`, at the ISS daily dose measured by
 * ALTEA (NASA RadLab) with a small smooth ±8 % day-to-day variation, plus one
 * summary entry for previous missions when the crew member has flown before.
 */
export function seedDoseSeries(crewIndex: number, today: string, days = 14): SeedDose[] {
  const iss = radiationReference("iss").mSvPerDay;
  const daily: SeedDose[] = Array.from({ length: days }, (_, i) => {
    const day = addDays(today, -(days - i));
    return {
      recordedAt: `${day}T06:00:00.000Z`,
      doseMsv: round(iss * (1 + 0.08 * Math.sin(i * 1.3 + crewIndex * 2.1))),
      periodHours: 24,
      environment: "iss",
      note: null,
    };
  });
  const prior = PRIOR_MISSION_MSV[crewIndex % PRIOR_MISSION_MSV.length];
  if (!prior) return daily;
  return [
    {
      recordedAt: `${addDays(today, -400)}T00:00:00.000Z`,
      doseMsv: prior,
      periodHours: 180 * 24,
      environment: "iss",
      note: "Previous ISS increment (career summary, demo)",
    },
    ...daily,
  ];
}
