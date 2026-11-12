import thresholds from "@/data/rules/thresholds.json";

export interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
  /** Short label shown next to the baseline band. */
  label: string;
}

const v = thresholds.vitals;

/**
 * Display bands for TrendChart and StatusCard. Lower/upper bounds come from the
 * rules engine (data/rules/thresholds.json) where it defines them, so the band
 * matches where Watch begins. Other bounds are general reference values.
 */
export const REFERENCE_RANGES = {
  heartRate: { min: v.heartRateBpm.watchLow, max: v.heartRateBpm.watchHigh, unit: "bpm", label: "Normal band" },
  systolic: { min: v.systolicBp.watchLow, max: v.systolicBp.watchHigh, unit: "mmHg", label: "Normal band" },
  diastolic: { min: 60, max: v.diastolicBp.watchHigh, unit: "mmHg", label: "Normal band" },
  spo2: { min: v.spo2Pct.watchLow, max: 100, unit: "%", label: "Normal band" },
  glucose: { min: 70, max: 140, unit: "mg/dL", label: "Reference" },
  sleepHours: { min: v.sleepHours.watchLow, max: 9, unit: "h", label: "Normal band" },
  hrv: { min: v.hrvMs.watchLow, max: 100, unit: "ms", label: "Normal band" },
  stress: { min: 0, max: v.stressIndex.watchHigh, unit: "/100", label: "Normal band" },
  radiationDay: { min: 0, max: v.radiationMsvDay.watchHigh, unit: "mSv/d", label: "Below watch" },
  exerciseMinutes: { min: 120, max: 180, unit: "min", label: "Daily target" },
  hydration: { min: 2, max: 3, unit: "L", label: "Daily target" },
} satisfies Record<string, ReferenceRange>;

/** NASA-STD-3001 (2022) career effective-dose limit, all astronauts. */
export const CAREER_DOSE_LIMIT_MSV = 600;
