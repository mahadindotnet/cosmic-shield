import { describe, expect, it } from "vitest";
import { z } from "zod";
import { evaluateMindPattern, type MindDay } from "./rules";
import { CheckinInput } from "./schema";
import { seedCheckinSeries } from "./seed-data";
import { summarizeMind, type CheckinRow } from "./summary";

const TODAY = "2026-11-13";
const day = (d: string, mood: number, stress: number | null = 2): MindDay => ({ day: d, mood, stress });

describe("evaluateMindPattern (mood ≤ 2 or stress ≥ 4, 3 days in a row)", () => {
  it("is Normal without a run", () => {
    expect(evaluateMindPattern([day("2026-11-11", 4), day("2026-11-12", 2), day("2026-11-13", 4)], TODAY).status).toBe("normal");
  });

  it("Watch on 3 consecutive low-mood days ending today or yesterday", () => {
    const r = evaluateMindPattern([day("2026-11-10", 2), day("2026-11-11", 1), day("2026-11-12", 2)], TODAY);
    expect(r).toMatchObject({ status: "watch", lowMood: true, highStress: false, runDays: ["2026-11-10", "2026-11-11", "2026-11-12"] });
    expect(r.reason).toBe("Over the last 3 days in a row, mood was 2/5 or lower.");
  });

  it("Watch on 3 consecutive high-stress days; names both when both run", () => {
    expect(evaluateMindPattern([day("2026-11-11", 4, 4), day("2026-11-12", 3, 5), day("2026-11-13", 4, 4)], TODAY)).toMatchObject({ status: "watch", highStress: true, lowMood: false });
    const both = evaluateMindPattern([day("2026-11-11", 1, 4), day("2026-11-12", 2, 5), day("2026-11-13", 2, 4)], TODAY);
    expect(both.reason).toBe("Over the last 3 days in a row, mood was 2/5 or lower and stress was 4/5 or higher.");
  });

  it("needs a check-in on every day of the run (a gap breaks it)", () => {
    expect(evaluateMindPattern([day("2026-11-09", 1), day("2026-11-11", 1), day("2026-11-12", 1)], TODAY).status).toBe("normal");
  });

  it("an old run stops counting (latest check-in more than a day ago)", () => {
    expect(evaluateMindPattern([day("2026-11-08", 1), day("2026-11-09", 1), day("2026-11-10", 1)], TODAY).status).toBe("normal");
  });

  it("2 low days are not enough; the latest day must be part of the run", () => {
    expect(evaluateMindPattern([day("2026-11-12", 1), day("2026-11-13", 2)], TODAY).status).toBe("normal");
    expect(evaluateMindPattern([day("2026-11-10", 1), day("2026-11-11", 1), day("2026-11-12", 1), day("2026-11-13", 4)], TODAY).status).toBe("normal");
  });
});

describe("CheckinInput (1–5 scales)", () => {
  const errors = (input: Record<string, string>) => {
    const r = CheckinInput.safeParse(input);
    return r.success ? {} : z.flattenError(r.error).fieldErrors;
  };
  it("parses ratings; optional sleep quality and note become null", () => {
    expect(CheckinInput.parse({ mood: "4", stress: "2", sleepQuality: "", note: "  " })).toEqual({ mood: 4, stress: 2, sleepQuality: null, note: null });
  });
  it("rejects old 0–10 values and missing ratings", () => {
    expect(errors({ mood: "7", stress: "2" }).mood).toEqual(["your mood must be 1–5."]);
    expect(errors({ mood: "0", stress: "2" }).mood).toEqual(["your mood must be 1–5."]);
    expect(errors({ mood: "", stress: "2" }).mood).toEqual(["Choose your mood."]);
    expect(errors({ mood: "3", stress: "2", note: "x".repeat(281) }).note).toEqual(["Keep the note under 280 characters."]);
  });
});

describe("summarizeMind", () => {
  const row = (id: number, recordedAt: string, mood: number, stress = 2, note: string | null = null): CheckinRow => ({
    id,
    recordedAt,
    source: "manual",
    mood,
    stress,
    sleepQuality: null,
    note,
  });

  it("counts every check-in per UTC day for the streak, and the latest of a day counts for the rules", () => {
    const s = summarizeMind(
      [row(1, "2026-11-11T08:00:00Z", 2), row(2, "2026-11-12T08:00:00Z", 2), row(3, "2026-11-13T07:00:00Z", 4), row(4, "2026-11-13T21:00:00Z", 1)],
      TODAY,
    );
    expect(s.checkinsByDay).toEqual({ "2026-11-11": 1, "2026-11-12": 1, "2026-11-13": 2 });
    expect(s.pattern.status).toBe("watch");
    expect(s.history.map((h) => [h.id, h.current, h.status])).toEqual([
      [4, true, "watch"],
      [3, false, "watch"],
      [2, true, "normal"],
      [1, true, "normal"],
    ]);
    expect(s.tile).toEqual({ metric: "Mood today", value: "1", unit: "/5", status: "watch" });
    expect(s.checkedInToday).toBe(true);
    expect(s.daysThisMonth).toBe(3);
    expect(s.trends.mood.at(-1)).toMatchObject({ day: TODAY, value: 1 });
  });

  it("is empty without rows", () => {
    expect(summarizeMind([], TODAY)).toMatchObject({ latest: null, tile: null, history: [], checkedInToday: false, daysThisMonth: 0 });
  });
});

describe("seedCheckinSeries", () => {
  it("14 evenings ending yesterday, 1–5 scales, never a Watch", () => {
    for (let i = 0; i < 4; i++) {
      const s = seedCheckinSeries(i, TODAY);
      expect(s).toHaveLength(14);
      expect(s.at(-1)!.recordedAt).toBe("2026-11-12T20:00:00.000Z");
      for (const c of s) {
        expect(c.mood).toBeGreaterThanOrEqual(3);
        expect(c.mood).toBeLessThanOrEqual(5);
        expect(c.stress).toBeLessThanOrEqual(3);
      }
      const days = s.map((c) => ({ day: c.recordedAt.slice(0, 10), mood: c.mood, stress: c.stress }));
      expect(evaluateMindPattern(days, "2026-11-12").status).toBe("normal");
    }
  });
});
