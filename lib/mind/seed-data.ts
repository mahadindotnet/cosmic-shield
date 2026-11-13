import { addDays } from "@/lib/vitals/summary";
import { evaluateMindPattern } from "./rules";

/** Per-crew typical mood and stress for the demo seed (1–5; app defaults). */
const PROFILES = [
  { mood: 4, stress: 2 },
  { mood: 4, stress: 2 },
  { mood: 3, stress: 3 },
  { mood: 4, stress: 2 },
];

export interface SeedCheckin {
  recordedAt: string;
  mood: number;
  stress: number;
  sleepQuality: number;
  note: null;
}

/**
 * Deterministic demo check-ins: one each evening (20:00 UTC) on the `days`
 * days before `today`, so today's check-in is still open and the streak shows
 * "check in before midnight". Small smooth variation; mood stays 3–5 and
 * stress 1–3, so the seed never raises the Mind pattern. No notes.
 */
export function seedCheckinSeries(crewIndex: number, today: string, days = 14): SeedCheckin[] {
  const p = PROFILES[crewIndex % PROFILES.length];
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
  const rows = Array.from({ length: days }, (_, i) => {
    const w = (k: number) => Math.round(Math.sin(i * 1.1 + crewIndex * 1.9 + k));
    return {
      recordedAt: `${addDays(today, -(days - i))}T20:00:00.000Z`,
      mood: clamp(p.mood + w(0), 3, 5),
      stress: clamp(p.stress + w(1), 1, 3),
      sleepQuality: clamp(4 + w(2), 2, 5),
      note: null,
    };
  });
  // Guard: the seed must never raise a status by itself.
  const perDay = rows.map((r) => ({ day: r.recordedAt.slice(0, 10), mood: r.mood, stress: r.stress }));
  if (evaluateMindPattern(perDay, addDays(today, -1)).status !== "normal") throw new Error("Seed check-ins would raise the Mind pattern");
  return rows;
}
