/**
 * Pure, deterministic helpers for scripts/build-baselines.ts.
 * No I/O here, so every number in data/nasa/derived/ can be unit-tested
 * (scripts/lib/baseline-math.test.ts).
 */

/* ------------------------------------------------------------ statistics */

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("mean of an empty list");
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("median of an empty list");
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Sample standard deviation (n − 1). Null when n < 2. */
export function sampleSd(xs: readonly number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export interface Summary {
  n: number;
  min: number;
  max: number;
  mean: number;
  median: number;
}

export function summarize(xs: readonly number[]): Summary {
  return { n: xs.length, min: Math.min(...xs), max: Math.max(...xs), mean: mean(xs), median: median(xs) };
}

/** Change of `value` from `reference`, absolute and as a percentage of the reference. */
export function changeFrom(value: number, reference: number) {
  return { absolute: value - reference, percent: reference === 0 ? null : ((value - reference) / reference) * 100 };
}

/** Round to a number of decimal places (avoids float noise like 4.300000000001). */
export const roundTo = (v: number, places: number) => {
  const f = 10 ** places;
  return Math.round((v + Number.EPSILON) * f) / f;
};

/** Most common value; ties go to the value seen first. */
export function mode<T>(values: readonly T[], key: (v: T) => string = String): { value: T; count: number; distinct: number } {
  if (values.length === 0) throw new Error("mode of an empty list");
  const counts = new Map<string, { value: T; count: number }>();
  for (const v of values) {
    const k = key(v);
    const c = counts.get(k);
    if (c) c.count++;
    else counts.set(k, { value: v, count: 1 });
  }
  let best: { value: T; count: number } | undefined;
  for (const c of counts.values()) if (!best || c.count > best.count) best = c;
  return { ...best!, distinct: counts.size };
}

/* ------------------------------------------------------- unit conversion */

/** micro-unit per hour → milli-unit per day: × 24 h ÷ 1000. */
export const microPerHourToMilliPerDay = (perHour: number) => (perHour * 24) / 1000;

/** μGy/h → mGy/day. */
export const uGyPerHourToMGyPerDay = microPerHourToMilliPerDay;

/** μSv/h → mSv/day. */
export const uSvPerHourToMSvPerDay = microPerHourToMilliPerDay;

/* ------------------------------------------------------- OSD-575 samples */

export interface Timepoint {
  /** As written in the sample name, e.g. "L-92" or "R+1". */
  label: string;
  phase: "pre-flight" | "post-flight";
  /** Signed days: L-92 → −92 (before launch), R+1 → 1 (after return). */
  days_from_event: number;
  relative_to: "launch" | "return";
}

/** Parses "C001_serum_L-92" → { crew: "C001", timepoint: L-92 }. */
export function parseSampleName(name: string): { crew: string; timepoint: Timepoint } {
  const m = /^(C\d{3})_[a-z]+_([LR])([+-])(\d+)$/i.exec(name.trim());
  if (!m) throw new Error(`Unrecognised OSD-575 sample name: "${name}"`);
  const [, crew, letter, sign, days] = m;
  const launch = letter.toUpperCase() === "L";
  const signed = (sign === "-" ? -1 : 1) * Number(days);
  return {
    crew,
    timepoint: {
      label: `${letter.toUpperCase()}${sign}${days}`,
      phase: launch ? "pre-flight" : "post-flight",
      days_from_event: signed,
      relative_to: launch ? "launch" : "return",
    },
  };
}

/** Pre-flight first (most days before launch first), then post-flight in order. */
export function compareTimepoints(a: Timepoint, b: Timepoint) {
  if (a.phase !== b.phase) return a.phase === "pre-flight" ? -1 : 1;
  return a.days_from_event - b.days_from_event;
}

const UNIT_LABELS: Record<string, string> = {
  milligram_per_deciliter: "mg/dL",
  millimol_per_liter: "mmol/L",
  gram_per_deciliter: "g/dL",
  units_per_liter: "U/L",
};

/**
 * Finds the value and lab-range columns for an analyte prefix. Columns are
 * `<prefix>_value_<unit>`, `<prefix>_range_min_<unit>` and
 * `<prefix>_range_max_<unit>`, except ALT and AST, whose max column is
 * `<prefix>_max_<unit>` (no "range_").
 */
export function resolveAnalyteColumns(header: readonly string[], prefix: string) {
  const valueCol = header.find((h) => h.startsWith(`${prefix}_value_`));
  if (!valueCol) throw new Error(`No "${prefix}_value_*" column in the CSV`);
  const unitSlug = valueCol.slice(`${prefix}_value_`.length);
  const pick = (...names: string[]) => names.find((n) => header.includes(n)) ?? null;
  return {
    value: valueCol,
    rangeMin: pick(`${prefix}_range_min_${unitSlug}`, `${prefix}_min_${unitSlug}`),
    rangeMax: pick(`${prefix}_range_max_${unitSlug}`, `${prefix}_max_${unitSlug}`),
    unitSlug,
    unit: UNIT_LABELS[unitSlug] ?? unitSlug.replace(/_/g, " "),
  };
}

/** Parses a lab value; "NA", "N/A" and blanks become null. */
export function parseLabNumber(v: string | undefined): number | null {
  if (v === undefined) return null;
  const t = v.trim();
  if (t === "" || /^n\/?a$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/* --------------------------------------------------------- RadLab doses */

/** A day counts as elevated when its dose exceeds this multiple of the window median. */
export const ELEVATED_DAY_FACTOR = 1.5;

/**
 * Consecutive runs of days whose dose is above `factor` × the median of all
 * days (a simple, transparent flag for spikes such as solar particle events).
 */
export function elevatedRuns(days: readonly { day: string; dose: number }[], factor = ELEVATED_DAY_FACTOR) {
  if (days.length === 0) return [];
  const threshold = factor * median(days.map((d) => d.dose));
  const runs: { start: string; end: string; peak_day: string; peak: number; threshold: number }[] = [];
  let prev: string | null = null;
  for (const d of [...days].sort((a, b) => a.day.localeCompare(b.day))) {
    if (d.dose <= threshold) {
      prev = null;
      continue;
    }
    const last = runs.at(-1);
    const consecutive = prev !== null && Date.parse(`${d.day}T00:00Z`) - Date.parse(`${prev}T00:00Z`) === 86_400_000;
    if (last && consecutive) {
      last.end = d.day;
      if (d.dose > last.peak) Object.assign(last, { peak_day: d.day, peak: d.dose });
    } else {
      runs.push({ start: d.day, end: d.day, peak_day: d.day, peak: d.dose, threshold });
    }
    prev = d.day;
  }
  return runs;
}

export interface DoseSample {
  /** UTC day, "YYYY-MM-DD". */
  day: string;
  detector: string;
  /** Dose rate per hour (μGy/h or μSv/h), or null if absent. */
  rate: number | null;
}

/** Share of the busiest day's sample count a detector-day needs to count as complete. */
export const COMPLETE_DAY = 0.9;

/**
 * Daily dose per UTC day. For each detector and day: mean rate × 24 ÷ 1000
 * (so μGy/h → mGy/day, μSv/h → mSv/day). Partial detector-days (fewer than
 * COMPLETE_DAY × that detector's busiest day) are dropped, then detectors are
 * averaged per day. Averaging within a day first keeps gaps or uneven cadence
 * from over-weighting part of a day. Returns [] when there are no rates.
 */
export function dailyDoses(samples: readonly DoseSample[], completeDay = COMPLETE_DAY) {
  const byDetectorDay = new Map<string, { detector: string; day: string; rates: number[] }>();
  for (const s of samples) {
    if (s.rate === null) continue;
    const key = `${s.detector}|${s.day}`;
    const entry = byDetectorDay.get(key) ?? { detector: s.detector, day: s.day, rates: [] };
    entry.rates.push(s.rate);
    byDetectorDay.set(key, entry);
  }

  const busiest = new Map<string, number>();
  for (const { detector, rates } of byDetectorDay.values()) {
    busiest.set(detector, Math.max(busiest.get(detector) ?? 0, rates.length));
  }

  const perDay = new Map<string, number[]>();
  for (const { detector, day, rates } of byDetectorDay.values()) {
    if (rates.length < completeDay * busiest.get(detector)!) continue;
    perDay.set(day, [...(perDay.get(day) ?? []), microPerHourToMilliPerDay(mean(rates))]);
  }

  return [...perDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, doses]) => ({ day, dose: mean(doses) }));
}
