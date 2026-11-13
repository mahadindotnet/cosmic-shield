import type { SectionSlug } from "@/components/cosmic-shield/sections";
import type { Basis } from "@/lib/health/reference-ranges";
import { radiationReference, type RadiationReference } from "@/lib/nasa/radiation";

export type MissionEnvironmentId = "iss" | "lunar" | "mars-transit" | "mars-surface";

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

  /** Typical daily dose equivalent, mSv/day, rounded for display (from data/nasa). */
  radiationMsvPerDay: number;
  /** Where radiationMsvPerDay comes from: measured by RadLab or published. */
  radiation: RadiationReference;
  /** App default: daily dose above this raises a Watch (2 × typical, 1 dp). */
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
  /** Where each number above comes from: a cited source or an app default. */
  provenance: Record<"missionDays" | "gravity" | "commsDelay" | "exerciseTarget" | "sansCadence" | "radiationWatch", Basis>;
}

/** Sources for the physical values (checked 2026-11-13). */
const SRC = {
  moon: "NASA Moon Fact Sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html): surface gravity 1.62 m/s² = 0.165 × Earth; semimajor axis 384,400 km → ≈ 1.28 s one-way light time; synodic period 29.53 days.",
  mars: "NASA Mars Fact Sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html): surface gravity 3.73 m/s² = 0.380 × Earth; Earth–Mars 54.6–401.4 × 10⁶ km → ≈ 3.0–22.3 min one-way light time; day 24.66 h.",
  drm: "Hassler DM et al., Science 2014;343:1244797: one NASA design reference mission with 180-day transits each way and a 500-day surface stay.",
} as const;

const APP: Basis = { basis: "app default" };
const COMMON_PROVENANCE = {
  exerciseTarget: APP,
  sansCadence: APP,
  radiationWatch: { basis: "app default", note: "2 × the environment's daily dose, rounded to 0.1 mSv." },
} satisfies Partial<MissionEnvironment["provenance"]>;

/**
 * Daily dose equivalents come from data/nasa/fixtures/radiation-environments.json
 * (built by `npm run data:build`): ISS measured by ALTEA via NASA RadLab;
 * lunar surface, Mars transit and Mars surface from peer-reviewed papers.
 * Every other number is labelled in `provenance`: sourced (NASA fact sheets,
 * Hassler 2014) or "app default" (a Cosmic Shield setting, not a NASA standard).
 */
function dose(id: Parameters<typeof radiationReference>[0]) {
  const ref = radiationReference(id);
  return {
    radiation: ref,
    radiationMsvPerDay: Math.round(ref.mSvPerDay * 100) / 100,
    radiationWatchMsvPerDay: Math.round(ref.mSvPerDay * 2 * 10) / 10,
  };
}

export const MISSION_ENVIRONMENTS: MissionEnvironment[] = [
  {
    id: "iss",
    name: "ISS",
    tagline: "Low Earth orbit · ~400 km",
    summary: "Partially shielded by Earth's magnetic field. Ground support is effectively live.",
    backdrop: { src: "/backgrounds/iss.webp", position: "50% 50%" },
    ...dose("iss"),
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
      "sleep-stress": "The Sun rises and sets on every orbit. Follow the station lighting schedule and close the sleep-station shade.",
      radiation: "Earth's magnetic field blocks much of the radiation. Doses spike briefly on passes through the South Atlantic Anomaly.",
      bone: "Without loading, weight-bearing bones lose density. Keep up your daily exercise target.",
      eyes: "Most long-duration ISS crew show some signs of SANS, likely driven by fluid shifting toward the head. Screen on schedule.",
      gi: "Thirst is blunted when fluids shift headward. Drink on a schedule rather than waiting until you feel thirsty.",
      mind: "Earth is in view and live calls home are possible. Use them; they help protect mood over long increments.",
    },
    sources: "ALTEA-Survey dose equivalent via NASA OSDR RadLab",
    provenance: {
      ...COMMON_PROVENANCE,
      missionDays: { basis: "app default", note: "Typical 6-month increment, used as a scenario." },
      gravity: { basis: "app default", note: "Microgravity shown as 0 g." },
      commsDelay: { basis: "app default", note: "Near-real-time link; not computed from a source." },
    },
  },
  {
    id: "lunar",
    name: "Lunar surface",
    tagline: "Lunar surface · one-sixth gravity",
    summary: "No magnetosphere and no thick atmosphere. Ground replies after a short pause.",
    backdrop: { src: "/backgrounds/lunar.webp", position: "50% 50%" },
    ...dose("lunar_surface"),
    missionDays: 30,
    missionDaysLabel: "30-day surface stay",
    gravityG: 0.165,
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
      "sleep-stress": "A lunar day lasts about 29.5 Earth days. Rely on the habitat lighting schedule, not the sun, to set your sleep cycle.",
      radiation: "About twice the ISS dose, measured on the lunar far side by Chang'E-4. EVAs add exposure, so log a dosimeter reading after every EVA.",
      bone: "One-sixth gravity gives some loading, but how well it protects bone is still unknown. Keep up resistance training.",
      eyes: "SANS risk in partial gravity is not yet known. Lunar dust is abrasive, so log any eye irritation after EVA.",
      gi: "All food comes from stored supplies. Log fibre and fluids so changes in the GI trend are easy to read.",
      mind: "Earth is always in the sky and calls are near-live, but the crew is small and confined. Daily check-ins catch problems early.",
    },
    sources: "Chang'E-4 LND (Zhang et al., Science Advances 2020)",
    provenance: {
      ...COMMON_PROVENANCE,
      missionDays: { basis: "app default", note: "30-day surface stay, used as a scenario." },
      gravity: { basis: "sourced", source: SRC.moon },
      commsDelay: { basis: "sourced", source: SRC.moon },
    },
  },
  {
    id: "mars-transit",
    name: "Mars transit",
    tagline: "Deep-space cruise",
    summary: "The highest exposure, and ground may be up to ~22 min away each way, so the crew acts on onboard guidance.",
    backdrop: { src: "/backgrounds/mars-transit.webp", position: "50% 45%" },
    ...dose("mars_transit"),
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
      radiation: "There is no protection from Earth's magnetic field for the whole cruise. At the published cruise rate, six months adds up to about 330 mSv, over half the 600 mSv career limit.",
      bone: "Months of microgravity come before landing in 0.38 g. Exercise is what keeps you able to walk on arrival; keep up your daily target.",
      eyes: "Long microgravity exposure raises SANS risk, and no eye specialist is reachable in real time. Screen on schedule.",
      gi: "Stored food slowly loses some vitamins. Log fluids and meals so any shortfall shows up early.",
      mind: "Earth shrinks to a bright dot and live calls are impossible. Isolation is the biggest behavioural risk, so check in every day.",
    },
    sources: "MSL-RAD cruise (Zeitlin et al., Science 2013)",
    provenance: {
      ...COMMON_PROVENANCE,
      missionDays: { basis: "sourced", source: SRC.drm },
      gravity: { basis: "app default", note: "Microgravity shown as 0 g." },
      commsDelay: { basis: "sourced", source: SRC.mars },
    },
  },
  {
    id: "mars-surface",
    name: "Mars surface",
    tagline: "Gale crater · 0.38 g",
    summary: "The planet blocks half the sky and the thin atmosphere adds a little shielding, but ground is still up to ~22 min away each way.",
    backdrop: { src: "/backgrounds/mars-surface.webp", position: "50% 50%" },
    ...dose("mars_surface"),
    missionDays: 500,
    missionDaysLabel: "500-day surface stay",
    gravityG: 0.38,
    gravityLabel: "0.38 g",
    commsDelayLabel: "3–22 min",
    commsRoundTripLabel: "6–44 min",
    commsDelayMaxMinutes: 22,
    groundSupport: "Delayed: up to ~44 min round trip. Act on onboard guidance first.",
    exerciseTargetMin: 90,
    sansCadence: "Monthly",
    shelter: "Enter the habitat storm shelter, and abort or postpone EVAs until the event passes.",
    notes: {
      vitals: "After months in microgravity, standing up in 0.38 g can cause light-headedness. Log readings at the same time each day while you readapt.",
      "sleep-stress": "A Mars day (sol) is about 40 minutes longer than an Earth day. Shift sleep with the habitat schedule, not by feel.",
      radiation: "About a third of the transit dose, because the planet blocks half the sky. EVAs add exposure, so log a dosimeter reading after every EVA.",
      bone: "0.38 g loads the skeleton only partly. Keep up resistance training to recover what was lost in transit.",
      eyes: "SANS signs that began in transit may persist. Martian dust is fine and abrasive, so log any eye irritation after EVA.",
      gi: "All food comes from stored supplies for a long stay. Log fibre and fluids so changes in the GI trend are easy to read.",
      mind: "Earth is a bright point in the sky and live calls are impossible. Small-crew isolation is the main behavioural risk, so check in every day.",
    },
    sources: "MSL-RAD surface (Hassler et al., Science 2014)",
    provenance: {
      ...COMMON_PROVENANCE,
      missionDays: { basis: "sourced", source: SRC.drm },
      gravity: { basis: "sourced", source: SRC.mars },
      commsDelay: { basis: "sourced", source: SRC.mars },
    },
  },
];

export function getMissionEnvironment(id: MissionEnvironmentId | null) {
  return MISSION_ENVIRONMENTS.find((m) => m.id === id) ?? null;
}

export function projectedMissionDose(env: MissionEnvironment) {
  return env.radiationMsvPerDay * env.missionDays;
}
