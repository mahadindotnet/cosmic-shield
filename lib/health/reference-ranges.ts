import thresholds from "@/data/rules/thresholds.json";

/** Where a number comes from: a cited source, or a Cosmic Shield setting. */
export type Basis = { basis: "sourced"; source: string } | { basis: "app default"; note?: string };

export interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
  /** Short label shown next to the baseline band. */
  label: string;
  /** Provenance of min/max. Unsourced ranges are "app default", never presented as NASA values. */
  provenance: Basis;
}

const v = thresholds.vitals;
const APP_DEFAULT = { basis: "app default" } as const;

/**
 * Display bands for TrendChart and StatusCard. Bounds that the rules engine
 * defines come from data/rules/thresholds.json, so the band matches where
 * Watch begins; the other bounds are app defaults. None is a clinical cut-off.
 */
export const REFERENCE_RANGES = {
  heartRate: { min: v.heartRateBpm.watchLow, max: v.heartRateBpm.watchHigh, unit: "bpm", label: "Normal band", provenance: APP_DEFAULT },
  systolic: { min: v.systolicBp.watchLow, max: v.systolicBp.watchHigh, unit: "mmHg", label: "Normal band", provenance: APP_DEFAULT },
  diastolic: {
    min: 60,
    max: v.diastolicBp.watchHigh,
    unit: "mmHg",
    label: "Normal band",
    provenance: { basis: "app default", note: "Lower bound 60 mmHg is an app default." },
  },
  spo2: { min: v.spo2Pct.watchLow, max: 100, unit: "%", label: "Normal band", provenance: APP_DEFAULT },
  glucose: {
    min: v.glucoseMgDl.watchBelow,
    max: v.glucoseMgDl.watchHigh,
    unit: "mg/dL",
    label: "Normal band",
    provenance: {
      basis: "app default",
      note: `Lower bound 70 mg/dL: ADA level 1 hypoglycaemia (sourced, see docs/rules.md). ${v.glucoseMgDl.note}`,
    },
  },
  sleepHours: {
    min: v.sleepHours.watchLow,
    max: 9,
    unit: "h",
    label: "Normal band",
    provenance: { basis: "app default", note: "Upper bound 9 h is an app default." },
  },
  hrv: {
    min: v.hrvMs.watchLow,
    max: 100,
    unit: "ms",
    label: "Normal band",
    provenance: { basis: "app default", note: "Population band; personal baselines are preferred (see docs/rules.md)." },
  },
  stress: { min: 0, max: v.stressIndex.watchHigh, unit: "/100", label: "Normal band", provenance: APP_DEFAULT },
  radiationDay: {
    min: 0,
    max: v.radiationMsvDay.watchHigh,
    unit: "mSv/d",
    label: "Below watch",
    provenance: { basis: "app default", note: v.radiationMsvDay.watchHighNote },
  },
  exerciseMinutes: { min: thresholds.bone.defaultDailyExerciseMin, max: thresholds.bone.defaultDailyExerciseMin + 60, unit: "min", label: "Daily target", provenance: APP_DEFAULT },
  hydration: { min: thresholds.gi.fluidMinL, max: thresholds.gi.fluidMaxL, unit: "L", label: "Daily target", provenance: APP_DEFAULT },
} satisfies Record<string, ReferenceRange>;

/**
 * Career effective-dose limit, all astronauts: 600 mSv (NASA-STD-3001 Volume 1).
 * Confirmed via Zanon C et al., Tomography 2026;12(7):106 (doi:10.3390/tomography12070106).
 */
export const CAREER_DOSE_LIMIT_MSV = v.radiationMsvDay.careerLimitMsv;
export const CAREER_DOSE_LIMIT_PROVENANCE: Basis = {
  basis: "sourced",
  source: "NASA-STD-3001 Volume 1 career effective-dose limit (via Zanon et al., Tomography 2026)",
};
