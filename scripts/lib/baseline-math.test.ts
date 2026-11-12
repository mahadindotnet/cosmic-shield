import { describe, expect, it } from "vitest";
import {
  changeFrom,
  compareTimepoints,
  dailyDoses,
  elevatedRuns,
  mean,
  median,
  mode,
  parseLabNumber,
  parseSampleName,
  resolveAnalyteColumns,
  roundTo,
  sampleSd,
  summarize,
  uGyPerHourToMGyPerDay,
  uSvPerHourToMSvPerDay,
  type DoseSample,
} from "./baseline-math";
import { latestEvents, simplifyDonkiEvent, donkiHost } from "../../lib/nasa/donki";
import { PUBLISHED_DOSE_EQUIVALENT, RADLAB_SOURCES } from "../nasa-sources";

describe("unit conversion", () => {
  it("μGy/h → mGy/day is × 24 ÷ 1000", () => {
    expect(uGyPerHourToMGyPerDay(1000)).toBe(24);
    expect(uGyPerHourToMGyPerDay(27.75)).toBeCloseTo(0.666, 10);
    expect(uGyPerHourToMGyPerDay(0)).toBe(0);
  });

  it("μSv/h → mSv/day is × 24 ÷ 1000", () => {
    expect(uSvPerHourToMSvPerDay(20.8333)).toBeCloseTo(0.5, 4);
    expect(uSvPerHourToMSvPerDay(125)).toBe(3);
  });
});

describe("mean, median, SD", () => {
  it("mean", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(mean([-92, -44, -3])).toBeCloseTo(-46.333, 3);
    expect(() => mean([])).toThrow();
  });

  it("median handles odd and even counts and does not mutate input", () => {
    const xs = [9, 1, 5];
    expect(median(xs)).toBe(5);
    expect(xs).toEqual([9, 1, 5]);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(() => median([])).toThrow();
  });

  it("sample SD uses n − 1 and is null below n = 2", () => {
    expect(sampleSd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(sampleSd([5])).toBeNull();
  });

  it("summarize", () => {
    expect(summarize([69, 100, 80, 80])).toEqual({ n: 4, min: 69, max: 100, mean: 82.25, median: 80 });
  });

  it("change from baseline", () => {
    expect(changeFrom(93.25, 75)).toEqual({ absolute: 18.25, percent: (18.25 / 75) * 100 });
    expect(changeFrom(1, 0).percent).toBeNull();
  });

  it("roundTo removes float noise", () => {
    expect(roundTo(0.1 + 0.2, 3)).toBe(0.3);
    expect(roundTo(75.33333, 3)).toBe(75.333);
    expect(roundTo(-4.04999, 1)).toBe(-4);
  });

  it("mode picks the most common value and counts variants", () => {
    expect(mode(["a", "b", "a"])).toEqual({ value: "a", count: 2, distinct: 2 });
    const r = mode([{ min: 8.6, max: 10.3 }, { min: 8.6, max: 10.4 }, { min: 8.6, max: 10.3 }], (x) => `${x.min}|${x.max}`);
    expect(r.value).toEqual({ min: 8.6, max: 10.3 });
    expect(r.distinct).toBe(2);
  });
});

describe("OSD-575 parsing", () => {
  it("parses sample names into crew, phase and signed days", () => {
    expect(parseSampleName("C001_serum_L-92")).toEqual({
      crew: "C001",
      timepoint: { label: "L-92", phase: "pre-flight", days_from_event: -92, relative_to: "launch" },
    });
    expect(parseSampleName("C004_serum_R+1").timepoint).toEqual({
      label: "R+1",
      phase: "post-flight",
      days_from_event: 1,
      relative_to: "return",
    });
    expect(() => parseSampleName("C001_serum_F+1x")).toThrow();
  });

  it("orders time points pre-flight → post-flight", () => {
    const labels = ["R+194", "L-3", "R+1", "L-92", "L-44", "R+45"].map((l) => parseSampleName(`C001_serum_${l}`).timepoint);
    expect(labels.sort(compareTimepoints).map((t) => t.label)).toEqual(["L-92", "L-44", "L-3", "R+1", "R+45", "R+194"]);
  });

  it("treats NA, N/A and blanks as missing", () => {
    expect(parseLabNumber("NA")).toBeNull();
    expect(parseLabNumber("N/A")).toBeNull();
    expect(parseLabNumber(" ")).toBeNull();
    expect(parseLabNumber("1.37")).toBe(1.37);
  });

  it("resolves columns, including the ALT/AST max-column quirk", () => {
    const header = [
      "glucose_value_milligram_per_deciliter",
      "glucose_range_min_milligram_per_deciliter",
      "glucose_range_max_milligram_per_deciliter",
      "alt_value_units_per_liter",
      "alt_range_min_units_per_liter",
      "alt_max_units_per_liter",
      "bun_to_creatinine_ratio_value",
      "creatinine_value_milligram_per_deciliter",
    ];
    expect(resolveAnalyteColumns(header, "glucose")).toMatchObject({
      rangeMax: "glucose_range_max_milligram_per_deciliter",
      unit: "mg/dL",
    });
    expect(resolveAnalyteColumns(header, "alt")).toMatchObject({ rangeMax: "alt_max_units_per_liter", unit: "U/L" });
    // "creatinine" must not match the BUN-to-creatinine ratio column.
    expect(resolveAnalyteColumns(header, "creatinine").value).toBe("creatinine_value_milligram_per_deciliter");
  });
});

describe("dailyDoses", () => {
  const day = (d: string, detector: string, rates: (number | null)[]): DoseSample[] =>
    rates.map((rate) => ({ day: d, detector, rate }));

  it("averages rates per day and converts μ/h → m/day", () => {
    const out = dailyDoses([...day("2022-04-01", "A", [20, 30]), ...day("2022-04-02", "A", [10, 10])]);
    expect(out).toEqual([
      { day: "2022-04-01", dose: 0.6 },
      { day: "2022-04-02", dose: 0.24 },
    ]);
  });

  it("averages detectors within a day, then the day is one value", () => {
    const out = dailyDoses([...day("2022-04-01", "D1", [10, 10]), ...day("2022-04-01", "D2", [30, 30])]);
    expect(out).toHaveLength(1);
    expect(out[0].dose).toBeCloseTo(0.48, 10);
  });

  it("drops partial days below 90% of the busiest day", () => {
    const full = day("2022-04-01", "A", Array(10).fill(10));
    const partial = day("2022-04-02", "A", Array(8).fill(99));
    expect(dailyDoses([...full, ...partial]).map((d) => d.day)).toEqual(["2022-04-01"]);
  });

  it("ignores nulls and returns [] when no rates exist", () => {
    expect(dailyDoses(day("2022-04-01", "A", [null, null]))).toEqual([]);
    expect(dailyDoses(day("2022-04-01", "A", [null, 10]))[0].dose).toBeCloseTo(0.24, 10);
  });
});

describe("DONKI simplification", () => {
  it("maps each event type to the common shape", () => {
    expect(
      simplifyDonkiEvent("FLR", { flrID: "F1", beginTime: "2026-10-01T10:00Z", classType: "M1.2", link: "https://x/f" }),
    ).toEqual({ type: "FLR", id: "F1", start_time: "2026-10-01T10:00Z", class_or_intensity: "M1.2", link: "https://x/f" });
    expect(
      simplifyDonkiEvent("CME", {
        activityID: "C1",
        startTime: "2026-10-02T00:00Z",
        cmeAnalyses: [
          { isMostAccurate: false, type: "S", speed: 300 },
          { isMostAccurate: true, type: "C", speed: 650 },
        ],
      }).class_or_intensity,
    ).toBe("C-type, 650 km/s");
    expect(
      simplifyDonkiEvent("GST", { gstID: "G1", startTime: "2026-10-04T18:00Z", allKpIndex: [{ kpIndex: 5.67 }, { kpIndex: 7 }] })
        .class_or_intensity,
    ).toBe("Kp 7");
    expect(simplifyDonkiEvent("SEP", { sepID: "S1", eventTime: "2026-10-05T00:00Z" })).toMatchObject({
      class_or_intensity: null,
      link: null,
    });
    expect(() => simplifyDonkiEvent("FLR", { classType: "X1" })).toThrow();
  });

  it("sorts newest first and keeps the limit", () => {
    const ev = (id: string, t: string) => ({ type: "CME" as const, id, start_time: t, class_or_intensity: null, link: null });
    const out = latestEvents([ev("a", "2026-01-01T00:00Z"), ev("b", "2026-03-01T00:00Z"), ev("c", "2026-02-01T00:00Z")], 2);
    expect(out.map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("identifies the gateway or CCMC fallback host", () => {
    expect(donkiHost("https://api.nasa.gov/DONKI/CME?api_key=***")).toBe("api.nasa.gov");
    expect(donkiHost("https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR")).toBe("kauai.ccmc.gsfc.nasa.gov");
    expect(donkiHost("not a url")).toBe("unknown");
  });
});

describe("elevatedRuns (notable event flag)", () => {
  const series = (doses: number[]) => doses.map((dose, i) => ({ day: `2022-04-0${i + 1}`, dose }));

  it("groups consecutive days above 1.5 × median into one run", () => {
    // Shape of the LRO CRaTER window, 1-7 Apr 2022.
    const runs = elevatedRuns(series([0.657, 3.243, 1.299, 0.41, 0.33, 0.29, 0.28]));
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ start: "2022-04-01", end: "2022-04-03", peak_day: "2022-04-02", peak: 3.243 });
    expect(runs[0].threshold).toBeCloseTo(1.5 * 0.41, 10);
  });

  it("splits non-consecutive spikes and returns [] for flat series", () => {
    expect(elevatedRuns(series([1, 5, 1, 1, 5, 1, 1]))).toHaveLength(2);
    expect(elevatedRuns(series([0.66, 0.67, 0.66, 0.68]))).toEqual([]);
    expect(elevatedRuns([])).toEqual([]);
  });
});

describe("published dose equivalents", () => {
  it("are the paper values, copied as-is with a citation and a verbatim quote", () => {
    const byEnv = Object.fromEntries(PUBLISHED_DOSE_EQUIVALENT.map((p) => [p.environmentId, p]));
    expect(byEnv.mars_transit.mSv_per_day).toBe(1.84);
    expect(byEnv.mars_surface.mSv_per_day).toBe(0.64);
    expect(byEnv.lunar_surface.mSv_per_day).toBe(1.369);
    for (const p of PUBLISHED_DOSE_EQUIVALENT) {
      expect(p.citation.doi).toMatch(/^10\.1126\//);
      expect(p.citation.url).toBe(`https://doi.org/${p.citation.doi}`);
      expect(p.quote.length).toBeGreaterThan(20);
    }
  });

  it("never duplicate an environment that has RadLab dose equivalent", () => {
    const measured = new Set(RADLAB_SOURCES.filter((s) => s.role === "dose_equivalent").map((s) => s.environmentId));
    for (const p of PUBLISHED_DOSE_EQUIVALENT) expect(measured.has(p.environmentId)).toBe(false);
  });
});
