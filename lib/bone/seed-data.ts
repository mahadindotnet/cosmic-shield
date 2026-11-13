import { addDays } from "@/lib/vitals/summary";
import { sessionKind } from "./rules";

export interface SeedBone {
  recordedAt: string;
  kind: ReturnType<typeof sessionKind>;
  minutes: number;
  aerobicMinutes: number;
  resistanceMinutes: number;
  loadKg: number;
  reps: number;
  calciumMg: number;
  vitaminDIu: number;
  note: null;
}

/**
 * Deterministic demo bone logs: one per day (18:00 UTC) on the `days` days
 * before `today`: aerobic 45–75 min and resistance 45–60 min (about the
 * 120-minute default target), a load around 60–80 kg × 30 reps, calcium
 * 900–1200 mg and vitamin D 700–1000 IU. Never raises bone_exercise.
 */
export function seedBoneSeries(crewIndex: number, today: string, days = 14): SeedBone[] {
  return Array.from({ length: days }, (_, i) => {
    const w = (k: number) => Math.sin(i * 1.2 + crewIndex * 1.7 + k);
    const aerobic = Math.round(60 + 15 * w(0));
    const resistance = Math.round(52 + 7 * w(1));
    const loadKg = Math.round(70 + 10 * w(2));
    return {
      recordedAt: `${addDays(today, -(days - i))}T18:00:00.000Z`,
      kind: sessionKind({ aerobicMinutes: aerobic, resistanceMinutes: resistance, loadKg }),
      minutes: aerobic + resistance,
      aerobicMinutes: aerobic,
      resistanceMinutes: resistance,
      loadKg,
      reps: 30,
      calciumMg: Math.round(1050 + 150 * w(3)),
      vitaminDIu: Math.round(850 + 150 * w(4)),
      note: null,
    };
  });
}
