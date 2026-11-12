import type { SectionSlug } from "@/components/cosmic-shield/sections";

export type MissionEnvironmentId = "iss" | "lunar" | "mars-transit";

/** Health modules that carry environment-specific guidance. */
export type ModuleSlug = Exclude<SectionSlug, "overview" | "mission">;

export interface Backdrop {
  src: string;
  /** object-position used when a portrait image covers a landscape screen. */
  position: string;
}

export interface MissionEnvironment {
  id: MissionEnvironmentId;
  name: string;
  tagline: string;
  summary: string;
  backdrop: Backdrop;

  /** Typical daily effective dose, mSv/day. */
  radiationMsvPerDay: number;
  /** App default: daily dose above this raises a Watch. ~2× typical. */
  radiationWatchMsvPerDay: number;
  missionDays: number;
  missionDaysLabel: string;

  gravityG: number;
  gravityLabel: string;

  commsDelayLabel: string;
  commsRoundTripLabel: string;
  /** Worst-case one-way delay, minutes. */
  commsDelayMaxMinutes: number;
  groundSupport: string;

  /** App default daily exercise target, minutes. */
  exerciseTargetMin: number;
  /** App default fundus (SANS) screening cadence. */
  sansCadence: string;
  /** What to do during a solar particle event. */
  shelter: string;

  notes: Record<ModuleSlug, string>;
  sources: string;
}

/** Background before a mission environment is chosen. */
export const DEFAULT_BACKDROP: Backdrop = { src: "/backgrounds/default.webp", position: "50% 45%" };

/**
 * Reference figures, rounded for display.
 * Dose: ISS dosimetry (~0.3–0.8 mSv/d), Chang'e-4 LND (~1.4 mSv/d on the Moon),
 * MSL RAD cruise (~1.8 mSv/d to Mars). Thresholds, targets and cadences
 * marked "app default" are Cosmic Shield settings, not NASA standards.
 */
export const MISSION_ENVIRONMENTS: MissionEnvironment[] = [
  {
    id: "iss",
    name: "ISS",
    tagline: "Low Earth orbit · ~400 km",
    summary: "Partially shielded by Earth's magnetic field. Ground support is effectively live.",
    backdrop: { src: "/backgrounds/iss.webp", position: "50% 50%" },
    radiationMsvPerDay: 0.5,
    radiationWatchMsvPerDay: 1,
    missionDays: 180,
    missionDaysLabel: "6-month increment",
    gravityG: 0,
    gravityLabel: "Microgravity",
    commsDelayLabel: "< 1 s",
    commsRoundTripLabel: "< 1 s",
    commsDelayMaxMinutes: 0,
    groundSupport: "Live: the flight surgeon can be reached in real time.",
    exerciseTargetMin: 120,
    sansCadence: "Every 2 weeks",
    shelter: "During a solar particle event, move to the most shielded module as directed by Mission Control.",
    notes: {
      vitals: "Fluids shift toward the head in microgravity. A puffy face and a slightly lower resting heart rate are common, so log at the same time each day.",
      "sleep-stress": "16 sunrises a day on 90-minute orbits. Follow the station lighting schedule and close the sleep-station shade.",
      radiation: "Earth's magnetic field blocks much of the radiation. Doses spike briefly on passes through the South Atlantic Anomaly.",
      bone: "Without loading, weight-bearing bones lose about 1–1.5% density per month. Aim for 2 h of exercise daily.",
      eyes: "Most long-duration ISS crew show some signs of SANS, likely driven by fluid shifting toward the head. Screen on schedule.",
      gi: "Thirst is blunted when fluids shift headward. Drink on a schedule rather than waiting until you feel thirsty.",
      mind: "Earth is in view and live calls home are possible. Use them; they help protect mood over long increments.",
    },
    sources: "NASA ISS dosimetry",
  },
  {
    id: "lunar",
    name: "Lunar base",
    tagline: "Lunar surface · one-sixth gravity",
    summary: "No magnetosphere and no thick atmosphere. Ground replies after a short pause.",
    backdrop: { src: "/backgrounds/lunar.webp", position: "50% 50%" },
    radiationMsvPerDay: 1.4,
    radiationWatchMsvPerDay: 2.5,
    missionDays: 30,
    missionDaysLabel: "30-day surface stay",
    gravityG: 0.166,
    gravityLabel: "0.17 g",
    commsDelayLabel: "≈ 1.3 s",
    commsRoundTripLabel: "≈ 2.6 s",
    commsDelayMaxMinutes: 0.02,
    groundSupport: "Near-live: about a 2.6 s round trip, so conversations work with a short pause.",
    exerciseTargetMin: 90,
    sansCadence: "Monthly",
    shelter: "Enter the habitat storm shelter, and abort or postpone EVAs until the event passes.",
    notes: {
      vitals: "Partial gravity brings back some load on the cardiovascular system. Log any light-headedness when you stand up.",
      "sleep-stress": "A lunar day lasts about 29 Earth days. Rely on the habitat lighting schedule, not the sun, to set your sleep cycle.",
      radiation: "Expect roughly 2–3× the ISS dose. EVAs add exposure, so log a dosimeter reading after every EVA.",
      bone: "One-sixth gravity gives some loading, but how well it protects bone is still unknown. Keep up resistance training.",
      eyes: "SANS risk in partial gravity is not yet known. Lunar dust is abrasive, so log any eye irritation after EVA.",
      gi: "All food comes from stored supplies. Log fibre and fluids so changes in the GI trend are easy to read.",
      mind: "Earth is always in the sky and calls are near-live, but the crew is small and confined. Daily check-ins catch problems early.",
    },
    sources: "Chang'e-4 Lunar Lander Neutron & Dosimetry",
  },
  {
    id: "mars-transit",
    name: "Mars transit",
    tagline: "Deep-space cruise",
    summary: "The highest exposure, and ground may be up to ~22 min away each way, so the crew acts on onboard guidance.",
    backdrop: { src: "/backgrounds/mars-transit.webp", position: "50% 45%" },
    radiationMsvPerDay: 1.8,
    radiationWatchMsvPerDay: 3,
    missionDays: 180,
    missionDaysLabel: "~6-month cruise, one way",
    gravityG: 0,
    gravityLabel: "Microgravity",
    commsDelayLabel: "3–22 min",
    commsRoundTripLabel: "6–44 min",
    commsDelayMaxMinutes: 22,
    groundSupport: "Delayed: up to ~44 min round trip. Act on onboard guidance first.",
    exerciseTargetMin: 120,
    sansCadence: "Every 2 weeks",
    shelter: "Move to the water-shielded storm shelter and stay there until the event passes.",
    notes: {
      vitals: "Same microgravity physiology as on the ISS, but with no live ground link. Out-of-range readings are escalated by the onboard rules engine first.",
      "sleep-stress": "There is no natural day or night. The ship's lighting schedule is your only clock, so keep sleep and wake times fixed.",
      radiation: "There is no protection from Earth's magnetic field for the whole cruise. Six months out is about 0.3 Sv, over half the career limit.",
      bone: "Months of microgravity come before landing in 0.38 g. Exercise is what keeps you able to walk on arrival; aim for 2 h daily.",
      eyes: "Long microgravity exposure raises SANS risk, and no eye specialist is reachable in real time. Screen on schedule.",
      gi: "Stored food slowly loses some vitamins. Log fluids and meals so any shortfall shows up early.",
      mind: "Earth shrinks to a bright dot and live calls are impossible. Isolation is the biggest behavioural risk, so check in every day.",
    },
    sources: "MSL Radiation Assessment Detector (cruise)",
  },
];

export function getMissionEnvironment(id: MissionEnvironmentId | null) {
  return MISSION_ENVIRONMENTS.find((m) => m.id === id) ?? null;
}

export function projectedMissionDose(env: MissionEnvironment) {
  return env.radiationMsvPerDay * env.missionDays;
}
