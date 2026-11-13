import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getMissionEnvironment } from "@/lib/mission/environments";
import { dailyRate, dailyWatchFor, evaluateCareer, evaluateDose, RADIATION_LIMITS } from "./rules";
import { doseInput } from "./schema";
import { seedDoseSeries } from "./seed-data";
import { projectedMissionMsv, summarizeRadiation, type DoseRow } from "./summary";

const TODAY = "2026-11-13";

describe("dose rules", () => {
  it("turns a reading into a daily rate", () => {
    expect(dailyRate(0.72, 24)).toBe(0.72);
    expect(dailyRate(0.36, 12)).toBe(0.72);
    expect(dailyRate(118, 180 * 24)).toBeCloseTo(0.656, 3);
  });

  it("uses the environment's Watch level (2 × its typical dose), else the default", () => {
    expect(dailyWatchFor("mars-transit").level).toBe(getMissionEnvironment("mars-transit")!.radiationWatchMsvPerDay);
    expect(dailyWatchFor(null).level).toBe(RADIATION_LIMITS.defaultDailyWatch);
    expect(RADIATION_LIMITS.defaultDailyWatch).toBe(1.4);
  });

  it("flags a reading at or above the Watch level", () => {
    expect(evaluateDose({ doseMsv: 0.9, periodHours: 24, environment: null }).status).toBe("normal");
    const e = evaluateDose({ doseMsv: 2, periodHours: 24, environment: null });
    expect(e).toMatchObject({ status: "watch", rate: 2, watchLevel: 1.4 });
    expect(e.reason).toBe("Dose rate 2 mSv/d is at or above the Watch level (1.4 mSv/d).");
    // The same 2 mSv/d is normal on Mars transit (Watch 3.7).
    expect(evaluateDose({ doseMsv: 2, periodHours: 24, environment: "mars-transit" }).status).toBe("normal");
    expect(evaluateDose({ doseMsv: 1.4, periodHours: 24, environment: "iss" }).status).toBe("watch");
  });
});

describe("career rules (sum of entries vs the 600 mSv NASA-STD-3001 limit)", () => {
  it("is Normal below 300, Watch from 300 (app default), Escalate above 600 (sourced)", () => {
    expect(evaluateCareer(299.9).status).toBe("normal");
    expect(evaluateCareer(300).status).toBe("watch");
    expect(evaluateCareer(600).status).toBe("watch");
    const e = evaluateCareer(600.5);
    expect(e.status).toBe("escalate");
    expect(e.reason).toBe("Career dose 600.5 mSv is above the 600 mSv career limit (NASA-STD-3001).");
    expect(evaluateCareer(150).pctOfLimit).toBe(25);
  });
});

describe("doseInput", () => {
  const schema = doseInput(TODAY);
  const form = { day: TODAY, doseMsv: "0.72", periodHours: "24", note: "" };
  const errors = (over: Record<string, string>) => {
    const r = schema.safeParse({ ...form, ...over });
    return r.success ? {} : z.flattenError(r.error).fieldErrors;
  };
  it("parses a reading; blank note is null", () => {
    expect(schema.parse(form)).toEqual({ day: TODAY, doseMsv: 0.72, periodHours: 24, note: null });
  });
  it("rejects future days, missing dose, out-of-range values and long notes", () => {
    expect(errors({ day: "2026-11-14" }).day).toEqual(["The day can't be in the future."]);
    expect(errors({ doseMsv: "" }).doseMsv).toEqual(["Enter the dose."]);
    expect(errors({ doseMsv: "-1" }).doseMsv).toEqual(["The dose must be 0–500."]);
    expect(errors({ periodHours: "0" }).periodHours).toEqual(["The period must be 1–720."]);
    expect(errors({ note: "x".repeat(201) }).note).toEqual(["Keep the note under 200 characters."]);
  });
});

describe("summarizeRadiation", () => {
  const row = (id: number, recordedAt: string, doseMsv: number, periodHours = 24, environment: string | null = "iss"): DoseRow => ({
    id,
    recordedAt,
    doseMsv,
    periodHours,
    environment,
    note: null,
    source: "seed",
  });

  it("career = sum of every entry; the trend leaves out long summary entries", () => {
    const s = summarizeRadiation(
      [row(1, "2025-10-09T00:00:00Z", 118, 4320), row(2, "2026-11-12T06:00:00Z", 0.7), row(3, "2026-11-13T07:00:00Z", 0.5), row(4, "2026-11-13T19:00:00Z", 0.9)],
      TODAY,
      3,
    );
    expect(s.career.totalMsv).toBe(120.1);
    expect(s.career.status).toBe("normal");
    expect(s.trend).toEqual([
      { day: "2026-11-11", label: "11 Nov", value: null },
      { day: "2026-11-12", label: "12 Nov", value: 0.7 },
      { day: "2026-11-13", label: "13 Nov", value: 0.7 },
    ]);
    expect(s.windowTotalMsv).toBe(2.1);
    expect(s.latest?.id).toBe(4);
    expect(s.tile).toEqual({ value: "0.9", unit: "mSv/d", status: "normal" });
    expect(s.history.map((h) => h.id)).toEqual([4, 3, 2, 1]);
  });

  it("is empty without rows (career 0)", () => {
    const s = summarizeRadiation([], TODAY);
    expect(s.latest).toBeNull();
    expect(s.career).toMatchObject({ totalMsv: 0, status: "normal" });
  });

  it("projects a full mission from the environment's daily rate", () => {
    const mt = getMissionEnvironment("mars-transit")!;
    expect(projectedMissionMsv(mt.radiationMsvPerDay, mt.missionDays)).toBe(Math.round(mt.radiationMsvPerDay * mt.missionDays));
  });
});

describe("seedDoseSeries", () => {
  it("is deterministic, ends yesterday, and never raises a status", () => {
    for (let i = 0; i < 4; i++) {
      const s = seedDoseSeries(i, TODAY);
      expect(seedDoseSeries(i, TODAY)).toEqual(s);
      expect(s.at(-1)!.recordedAt).toBe("2026-11-12T06:00:00.000Z");
      for (const d of s) expect(evaluateDose(d).status).toBe("normal");
      expect(evaluateCareer(s.reduce((a, d) => a + d.doseMsv, 0)).status).toBe("normal");
    }
  });
});
