/**
 * Simulated nightly sleep, HRV (RMSSD, ms), sleep quality and stress for the
 * demo crew. Not NASA data. Deterministic (same numbers every seed) and
 * relative to the seed date: the last night is always "last night", so the
 * early-warning demo works whenever the database is re-seeded.
 *
 * Night-to-night variation is realistic rather than flat: RMSSD varies with a
 * coefficient of variation of 8–12 % and sleep with an SD of 0.4–0.6 h around
 * each person's baseline (app default demo settings). Values are clamped
 * above the per-night Watch levels, so seeded normal nights never show Watch.
 */
import thresholds from "@/data/rules/thresholds.json";
import type { NightlyReading } from "@/lib/rules/hrv-sleep-decline";

export const DEMO_NIGHTS = 14;

export interface DemoNight extends NightlyReading {
  hrvMs: number;
  sleepHours: number;
  /** 1 (poor) – 5 (great). */
  quality: number;
  /** 1 (calm) – 5 (overwhelmed). */
  stress: number;
}

export interface NightlyProfile {
  hrvMs: number;
  /** Night-to-night coefficient of variation of RMSSD (0.08–0.12). */
  hrvCv: number;
  sleepHours: number;
  /** Night-to-night SD of sleep, hours (0.4–0.6). */
  sleepSd: number;
  /** Last nights showing the early-warning pattern (oldest first). */
  decline?: { hrvFactor: number[]; sleepHours: number[] };
}

/** Personal baselines per demo crew profile. Only Lindqvist (CS-003) shows the decline pattern. */
export const NIGHTLY_PROFILES: Record<string, NightlyProfile> = {
  reyes: { hrvMs: 42, hrvCv: 0.09, sleepHours: 7.1, sleepSd: 0.45 },
  okafor: { hrvMs: 38, hrvCv: 0.11, sleepHours: 6.9, sleepSd: 0.55 },
  lindqvist: {
    hrvMs: 45,
    hrvCv: 0.1,
    sleepHours: 7.2,
    sleepSd: 0.5,
    // HRV about 18 %, 22 % and 20 % below baseline; sleep 5.4, 5.1 and 5.3 h.
    decline: { hrvFactor: [0.82, 0.78, 0.8], sleepHours: [5.4, 5.1, 5.3] },
  },
  tanaka: { hrvMs: 48, hrvCv: 0.08, sleepHours: 7.4, sleepSd: 0.4 },
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

/** Standard normal from two uniforms (Box–Muller), capped at ±2.5 SD. */
function normal(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  return Math.max(-2.5, Math.min(2.5, z));
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Seeded normal nights stay above the per-night Watch levels (app defaults). */
const SLEEP_FLOOR = thresholds.vitals.sleepHours.watchLow + 0.3;
const HRV_FLOOR = thresholds.vitals.hrvMs.watchLow + 1;

/** 14 nights ending the night before `today` (YYYY-MM-DD, UTC). */
export function demoNightlySeries(profileId: string, today: string): DemoNight[] {
  const p = NIGHTLY_PROFILES[profileId];
  if (!p) return [];
  const rand = prng(`${profileId}:nightly-v2`);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const declineFrom = DEMO_NIGHTS - (p.decline?.hrvFactor.length ?? 0);

  return Array.from({ length: DEMO_NIGHTS }, (_, i) => {
    const night = iso(todayMs - (DEMO_NIGHTS - i) * 86_400_000);
    // Always draw, so the normal nights don't change when a profile gains a decline.
    const zHrv = normal(rand);
    const zSleep = normal(rand);
    const zStress = rand();
    if (p.decline && i >= declineFrom) {
      const k = i - declineFrom;
      return {
        night,
        hrvMs: Math.round(p.hrvMs * p.decline.hrvFactor[k]),
        sleepHours: p.decline.sleepHours[k],
        quality: 2,
        stress: 3,
      };
    }
    const sleepHours = Math.round(clamp(p.sleepHours + zSleep * p.sleepSd, SLEEP_FLOOR, 9.5) * 10) / 10;
    return {
      night,
      hrvMs: Math.round(Math.max(HRV_FLOOR, p.hrvMs * (1 + zHrv * p.hrvCv))),
      sleepHours,
      // Quality follows sleep length; stress stays in the calm half of the scale.
      quality: clamp(Math.round(3 + (sleepHours - p.sleepHours) / 0.5), 2, 5),
      stress: zStress < 0.6 ? 2 : zStress < 0.85 ? 1 : 3,
    };
  });
}
