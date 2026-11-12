/**
 * Builds derived baselines from the cached NASA data (run data:fetch first).
 *
 *   npm run data:baselines
 *
 * Writes data/nasa/derived/radiation-environments.json: the mean daily dose
 * for each RadLab environment, with the exact source URL in every entry.
 *
 * Method: for each instrument detector and UTC day, average the dose-rate
 * samples and multiply by 24 h (μGy/h → mGy/day: × 24 ÷ 1000; likewise
 * μSv/h → mSv/day). Detectors are averaged per day, then days are averaged.
 * Averaging per day first stops data gaps or uneven cadence from weighting
 * part of a day more than the rest. Only complete days (≥ 90% of the day's
 * expected samples) are used.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DERIVED, RADLAB_DOCS, RADLAB_SOURCES, radlabUrl, type RadlabSource } from "./nasa-sources";

const COMPLETE_DAY = 0.9;

interface Sample {
  day: string;
  detector: string;
  absorbed: number | null;
  equivalent: number | null;
}

function parseCompactCsv(csv: string): Sample[] {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const cols = header.split(",");
  const at = (name: string) => cols.indexOf(name);
  const [iT, iId, iAbs, iEq] = [
    at("timestamp"),
    at("instrument_id"),
    at("absorbed_dose_rate_uGy_h"),
    at("dose_equivalent_rate_uSv_h"),
  ];
  if (iT < 0 || iAbs < 0) throw new Error(`Unexpected header: ${header}`);
  const num = (v: string | undefined) => (v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  return lines.map((l) => {
    const c = l.split(",");
    return { day: c[iT].slice(0, 10), detector: c[iId] || "default", absorbed: num(c[iAbs]), equivalent: num(c[iEq]) };
  });
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r4 = (v: number) => Number(v.toPrecision(4));

/** Per-day dose (rate mean × 24 / 1000) for one field, averaged across detectors. */
function dailyDoses(samples: Sample[], field: "absorbed" | "equivalent") {
  const byDetectorDay = new Map<string, number[]>();
  for (const s of samples) {
    const v = s[field];
    if (v === null) continue;
    const key = `${s.detector}|${s.day}`;
    byDetectorDay.set(key, [...(byDetectorDay.get(key) ?? []), v]);
  }
  if (byDetectorDay.size === 0) return null;

  // Expected samples per detector-day = the busiest day for that detector.
  const maxPerDetector = new Map<string, number>();
  for (const [key, vals] of byDetectorDay) {
    const det = key.split("|")[0];
    maxPerDetector.set(det, Math.max(maxPerDetector.get(det) ?? 0, vals.length));
  }

  const perDay = new Map<string, number[]>();
  for (const [key, vals] of byDetectorDay) {
    const [det, day] = key.split("|");
    if (vals.length < COMPLETE_DAY * maxPerDetector.get(det)!) continue; // partial day
    perDay.set(day, [...(perDay.get(day) ?? []), (mean(vals) * 24) / 1000]);
  }
  const days = [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, dose: mean(v) }));
  if (days.length === 0) return null;
  const doses = days.map((d) => d.dose);
  const sorted = [...doses].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    mean: r4(mean(doses)),
    median: r4(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2),
    min: r4(Math.min(...doses)),
    max: r4(Math.max(...doses)),
    days: days.map((d) => ({ date: d.day, dose: r4(d.dose) })),
  };
}

async function buildEntry(s: RadlabSource) {
  const samples = parseCompactCsv(await readFile(s.out, "utf8"));
  const absorbed = dailyDoses(samples, "absorbed");
  const equivalent = dailyDoses(samples, "equivalent");
  if (!absorbed) throw new Error(`${s.id}: no usable absorbed_dose_rate samples in ${s.out}`);

  return {
    id: s.id,
    environment: s.environment,
    relatedAppEnvironment: s.relatedAppEnvironment,
    relationNote: s.relationNote,
    spacecraft: s.spacecraft,
    instrument: s.instrument,
    detectors: [...new Set(samples.map((x) => x.detector))].sort(),
    window: { start: `${s.start}Z`, end: `${s.end}Z` },
    samples: samples.length,
    daysUsed: absorbed.days.length,
    meanDailyAbsorbedDose_mGy: absorbed.mean,
    /** Robust to short solar particle events inside the window. */
    medianDailyAbsorbedDose_mGy: absorbed.median,
    minDailyAbsorbedDose_mGy: absorbed.min,
    maxDailyAbsorbedDose_mGy: absorbed.max,
    meanDailyDoseEquivalent_mSv: equivalent?.mean ?? null,
    doseEquivalentNote: equivalent
      ? undefined
      : "RadLab publishes no dose_equivalent_rate for this instrument in this window, so mSv/day is not derived.",
    daily: absorbed.days.map((d) => ({
      date: d.date,
      absorbed_mGy: d.dose,
      equivalent_mSv: equivalent?.days.find((e) => e.date === d.date)?.dose ?? null,
    })),
    sourceUrl: radlabUrl(s),
    cachedFile: s.out,
  };
}

async function main() {
  const environments = await Promise.all(RADLAB_SOURCES.map(buildEntry));
  const out = {
    generatedAt: new Date().toISOString(),
    source: "NASA OSDR RadLab",
    docs: RADLAB_DOCS,
    method:
      "Per detector and UTC day: mean dose rate × 24 h. μGy/h → mGy/day (× 24 ÷ 1000); μSv/h → mSv/day where dose_equivalent_rate exists. Detectors averaged per day, then complete days (≥ 90% of expected samples) averaged.",
    caveat:
      "Absorbed dose (mGy) is measured in each instrument's detector material and is not the same as dose equivalent or effective dose in mSv. Use these values to compare environments, not as crew exposure.",
    environments,
  };

  await mkdir(dirname(DERIVED.radiation), { recursive: true });
  const tmp = `${DERIVED.radiation}.tmp`;
  await writeFile(tmp, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  await rename(tmp, DERIVED.radiation);

  console.log(`Wrote ${DERIVED.radiation}`);
  for (const e of environments) {
    const eq = e.meanDailyDoseEquivalent_mSv === null ? "n/a" : `${e.meanDailyDoseEquivalent_mSv} mSv/day`;
    console.log(
      `  ${e.environment.padEnd(28)} mean ${String(e.meanDailyAbsorbedDose_mGy).padStart(6)} · median ${String(e.medianDailyAbsorbedDose_mGy).padStart(6)} mGy/day  (${e.daysUsed} days; dose equivalent ${eq})`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
