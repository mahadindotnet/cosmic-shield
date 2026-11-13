import { describe, expect, it } from "vitest";
import { classifyBristolPhoto, PHOTO_NOT_ANALYSED_LABEL } from "./classifier";
import { BRISTOL_TYPES, evaluateGi, fluidBand, GI_LIMITS, type GiDay } from "./rules";
import { giInput } from "./schema";
import { seedGiSeries } from "./seed-data";
import { giDays, summarizeGi, type GiRow } from "./summary";

const TODAY = "2026-11-14";
const day = (d: string, ...types: number[]): GiDay => ({ day: d, types, fluidL: 0 });
let id = 0;
const row = (recordedAt: string, bristolType: number, extra: Partial<GiRow> = {}): GiRow => ({
  id: ++id,
  recordedAt,
  source: "manual",
  bristolType,
  hydrationLiters: null,
  note: null,
  hasPhoto: false,
  photoAnalysis: null,
  ...extra,
});

describe("Bristol scale", () => {
  it("has the seven Lewis & Heaton types and no diagnosis wording", () => {
    expect(BRISTOL_TYPES.map((b) => b.type)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(BRISTOL_TYPES[0].description).toBe("Separate hard lumps, like nuts (hard to pass)");
    expect(BRISTOL_TYPES[6].description).toMatch(/^Watery, no solid pieces/);
    for (const b of BRISTOL_TYPES) expect(b.description).not.toMatch(/constipation|diarrh|normal|disease/i);
  });
});

describe("gi_hard / gi_loose (2 of the last 3 days, Watch only)", () => {
  it("no entries in the window: no-data", () => {
    expect(evaluateGi([day("2026-11-01", 1), day("2026-11-02", 1)], TODAY).status).toBe("no-data");
  });

  it("types 1–2 on 2 of the last 3 days: gi_hard Watch with the advice", () => {
    const e = evaluateGi([day("2026-11-12", 2), day("2026-11-13", 4), day(TODAY, 1)], TODAY);
    expect(e.status).toBe("watch");
    expect(e.hard).toMatchObject({ ruleId: "gi_hard", status: "watch", days: ["2026-11-12", TODAY] });
    expect(e.hard.reason).toBe("Possible dehydration / constipation pattern: types 1–2 on 2 of the last 3 days. Increase fluids and fibre.");
    expect(e.loose.status).toBe("normal");
  });

  it("a single hard day, or hard days outside the window, is not enough", () => {
    expect(evaluateGi([day("2026-11-13", 1), day(TODAY, 4)], TODAY).status).toBe("normal");
    expect(evaluateGi([day("2026-11-10", 1), day("2026-11-11", 2), day(TODAY, 4)], TODAY).status).toBe("normal");
  });

  it("several entries on one day count as one day", () => {
    expect(evaluateGi([day(TODAY, 7, 6, 7)], TODAY).loose.status).toBe("normal");
  });

  it("types 6–7 on 2 of the last 3 days: gi_loose Watch with the CMO line", () => {
    const e = evaluateGi([day("2026-11-12", 6), day("2026-11-13", 7, 4)], TODAY);
    expect(e.loose.status).toBe("watch");
    expect(e.loose.reason).toBe("Loose stools: types 6–7 on 2 of the last 3 days. Hydrate, and contact the CMO if it continues.");
    expect(e.hard.status).toBe("normal");
  });

  it("never escalates", () => {
    const e = evaluateGi([day("2026-11-12", 7), day("2026-11-13", 7), day(TODAY, 1, 1)], TODAY);
    expect([e.status, e.hard.status, e.loose.status]).toEqual(["watch", "normal", "watch"]);
  });

  it("thresholds are the documented app defaults", () => {
    expect(GI_LIMITS).toMatchObject({ hardTypes: [1, 2], looseTypes: [6, 7], windowDays: 3, minDays: 2, fluidMinL: 2, fluidMaxL: 3 });
    expect([fluidBand(1.9), fluidBand(2), fluidBand(3), fluidBand(3.1)]).toEqual(["below", "within", "within", "above"]);
  });
});

describe("summarizeGi", () => {
  it("history newest first with descriptions; fluid today summed; tile from the latest type", () => {
    const rows = [
      row("2026-11-13T08:00:00.000Z", 4, { hydrationLiters: 2.5, source: "seed" }),
      row(`${TODAY}T07:00:00.000Z`, 3, { hydrationLiters: 1.2 }),
      row(`${TODAY}T15:00:00.000Z`, 5, { hydrationLiters: 0.9, hasPhoto: true, photoAnalysis: "not_analysed" }),
    ];
    const s = summarizeGi(rows, TODAY);
    expect(s.history.map((r) => r.bristolType)).toEqual([5, 3, 4]);
    expect(s.history[0]).toMatchObject({ description: "Soft blobs with clear-cut edges (passed easily)", photoLabel: PHOTO_NOT_ANALYSED_LABEL });
    expect(s.history[1].photoLabel).toBeNull();
    expect(s.fluidTodayL).toBe(2.1);
    expect(s.fluidBand).toBe("within");
    expect(s.tile).toMatchObject({ value: "5", unit: "/7", status: "normal" });
    expect(s.trends.bristol).toHaveLength(14);
    expect(s.trends.bristol.at(-1)).toMatchObject({ day: TODAY, value: 5 });
    expect(s.trends.fluid.at(-2)?.value).toBe(2.5);
    expect(s.trends.fluid[0].value).toBeNull();
  });

  it("no entries: no tile, no fluid", () => {
    const s = summarizeGi([], TODAY);
    expect(s).toMatchObject({ latest: null, tile: null, fluidTodayL: null, fluidBand: null });
    expect(s.evaluation.status).toBe("no-data");
  });

  it("a Watch pattern sets the tile status; a day's types keep time order", () => {
    const s = summarizeGi([row("2026-11-13T08:00:00.000Z", 6), row(`${TODAY}T08:00:00.000Z`, 7)], TODAY);
    expect(s.tile?.status).toBe("watch");
    expect(giDays([row(`${TODAY}T09:00:00.000Z`, 2), row(`${TODAY}T08:00:00.000Z`, 1)])[0].types).toEqual([1, 2]);
  });
});

describe("giInput", () => {
  const parse = (v: Record<string, string>) => giInput(TODAY).safeParse({ day: TODAY, bristolType: "", hydrationLiters: "", note: "", ...v });

  it("requires a Bristol type 1–7", () => {
    for (const t of ["", "0", "8", "3.5"]) {
      const r = parse({ bristolType: t });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].message).toBe("Choose the Bristol type (1–7).");
    }
    expect(parse({ bristolType: "4" }).data).toEqual({ day: TODAY, bristolType: 4, hydrationLiters: null, note: null });
  });

  it("fluid is optional, 0–10 L; no future days", () => {
    expect(parse({ bristolType: "4", hydrationLiters: "2.4" }).data?.hydrationLiters).toBe(2.4);
    expect(parse({ bristolType: "4", hydrationLiters: "11" }).success).toBe(false);
    expect(parse({ bristolType: "4", day: "2026-11-15" }).success).toBe(false);
  });
});

describe("seed and classifier", () => {
  it("demo series: types 3–5, 2.2–2.8 L, ending yesterday, never a pattern", () => {
    for (let c = 0; c < 4; c++) {
      const s = seedGiSeries(c, TODAY);
      expect(s).toHaveLength(14);
      expect(s.at(-1)!.recordedAt.slice(0, 10)).toBe("2026-11-13");
      for (const e of s) {
        expect(e.bristolType).toBeGreaterThanOrEqual(3);
        expect(e.bristolType).toBeLessThanOrEqual(5);
        expect(e.hydrationLiters).toBeGreaterThanOrEqual(2.2);
        expect(e.hydrationLiters).toBeLessThanOrEqual(2.8);
      }
      expect(summarizeGi(s.map((e) => row(e.recordedAt, e.bristolType)), TODAY).evaluation.status).not.toBe("watch");
    }
  });

  it("the photo classifier is a stub: never analyses, never suggests a type", () => {
    expect(classifyBristolPhoto()).toEqual({ analysed: false, status: "not_analysed", label: "Not analysed: prototype", bristolType: null });
  });
});
