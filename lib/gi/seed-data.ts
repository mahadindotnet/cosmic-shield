import { addDays } from "@/lib/vitals/summary";

export interface SeedGi {
  recordedAt: string;
  bristolType: number;
  hydrationLiters: number;
  note: null;
}

/**
 * Deterministic demo GI entries: one per day (08:00 UTC) on the `days` days
 * before `today`, Bristol types 3–5 and 2.2–2.8 L of fluid. Never raises
 * gi_hard or gi_loose.
 */
export function seedGiSeries(crewIndex: number, today: string, days = 14): SeedGi[] {
  return Array.from({ length: days }, (_, i) => {
    const w = (k: number) => Math.sin(i * 1.3 + crewIndex * 2.1 + k);
    return {
      recordedAt: `${addDays(today, -(days - i))}T08:00:00.000Z`,
      bristolType: 4 + Math.round(w(0)),
      hydrationLiters: Math.round((2.5 + 0.3 * w(1)) * 10) / 10,
      note: null,
    };
  });
}
