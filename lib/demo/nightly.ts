/**
 * Simulated nightly HRV (RMSSD, ms) and sleep for the demo crew. Not NASA
 * data. Deterministic (same numbers every seed) and relative to the seed
 * date: the last night is always "last night", so the early-warning demo
 * works whenever the database is re-seeded.
 */
import type { NightlyReading } from "@/lib/rules/hrv-sleep-decline";

export const NIGHTLY_METRICS = {
  hrv: "hrv_rmssd_nightly",
  sleep: "sleep_hours_nightly",
} as const;
export const DEMO_NIGHTS = 14;

interface Profile {
  hrvMs: number;
  sleepHours: number;
  /** Multipliers for HRV and absolute sleep hours on the last nights (oldest first). */
  decline?: { hrvFactor: number[]; sleepHours: number[] };
}

/** Personal baselines per demo crew profile. Only Lindqvist shows the decline pattern. */
const PROFILES: Record<string, Profile> = {
  reyes: { hrvMs: 40, sleepHours: 7.0 },
  okafor: { hrvMs: 36, sleepHours: 6.6 },
  lindqvist: {
    hrvMs: 45,
    sleepHours: 7.2,
    // HRV about 18%, 22% and 20% down; sleep 5.4, 5.1 and 5.3 h.
    decline: { hrvFactor: [0.82, 0.78, 0.8], sleepHours: [5.4, 5.1, 5.3] },
  },
  tanaka: { hrvMs: 48, sleepHours: 7.4 },
};

/** Small seeded PRNG (mulberry32) so every seed produces the same values. */
function prng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * 14 nights ending the night before `today` (YYYY-MM-DD, UTC). Normal nights
 * vary by at most ±4% HRV and ±0.25 h sleep around the personal baseline.
 */
export function demoNightlySeries(
  profileId: string,
  today: string,
): NightlyReading[] {
  const p = PROFILES[profileId];
  if (!p) return [];
  const rand = prng(profileId);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const declineFrom = DEMO_NIGHTS - (p.decline?.hrvFactor.length ?? 0);

  return Array.from({ length: DEMO_NIGHTS }, (_, i) => {
    const night = iso(todayMs - (DEMO_NIGHTS - i) * 86_400_000);
    const jitterHrv = (rand() * 2 - 1) * 0.04;
    const jitterSleep = (rand() * 2 - 1) * 0.25;
    if (p.decline && i >= declineFrom) {
      const k = i - declineFrom;
      return {
        night,
        hrvMs: Math.round(p.hrvMs * p.decline.hrvFactor[k]),
        sleepHours: p.decline.sleepHours[k],
      };
    }
    return {
      night,
      hrvMs: Math.round(p.hrvMs * (1 + jitterHrv)),
      sleepHours: Math.round((p.sleepHours + jitterSleep) * 10) / 10,
    };
  });
}
