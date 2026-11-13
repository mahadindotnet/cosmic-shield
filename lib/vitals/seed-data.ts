import { addDays } from "./summary";
import type { VitalsValues } from "./rules";

/** Per-crew resting values for the demo seed (app defaults, all inside the normal bands). */
const PROFILES: VitalsValues[] = [
  { heartRate: 64, systolic: 116, diastolic: 74, spo2: 98, glucose: 88 },
  { heartRate: 70, systolic: 120, diastolic: 76, spo2: 97, glucose: 94 },
  { heartRate: 67, systolic: 114, diastolic: 72, spo2: 98, glucose: 84 },
  { heartRate: 72, systolic: 122, diastolic: 78, spo2: 98, glucose: 91 },
];

export interface SeedVitals extends VitalsValues {
  recordedAt: string;
}

/**
 * Deterministic demo vitals: one morning reading (07:30 UTC) on each of the
 * `days` days before `today`, so today stays free for a real entry. Small
 * smooth day-to-day variation; no randomness and every value stays inside the
 * Normal band, so seeded data never raises a status on its own.
 */
export function seedVitalsSeries(crewIndex: number, today: string, days = 14): SeedVitals[] {
  const p = PROFILES[crewIndex % PROFILES.length];
  const phase = crewIndex * 1.7;
  return Array.from({ length: days }, (_, i) => {
    const w = (k: number) => Math.sin(i * 0.9 + phase + k);
    const day = addDays(today, -(days - i));
    return {
      recordedAt: `${day}T07:30:00.000Z`,
      heartRate: p.heartRate + Math.round(3 * w(0)),
      systolic: p.systolic + Math.round(4 * w(1)),
      diastolic: p.diastolic + Math.round(3 * w(2)),
      spo2: Math.min(100, p.spo2 + Math.round(w(3))),
      // Glucose every other morning, to show the optional field.
      glucose: i % 2 === 0 && p.glucose !== null ? p.glucose + Math.round(5 * w(4)) : null,
    };
  });
}
