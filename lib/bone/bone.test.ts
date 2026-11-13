import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MISSION_ENVIRONMENTS } from "@/lib/mission/environments";
import { BONE_LIMITS, dailyExerciseTarget, evaluateWeek, sessionKind, type BoneDay } from "./rules";
import { boneInput } from "./schema";
import { seedBoneSeries } from "./seed-data";
import { boneDays, summarizeBone, type BoneRow } from "./summary";

const TODAY = "2026-11-14";
const day = (d: string, totalMinutes: number): BoneDay => ({
  day: d,
  aerobicMinutes: totalMinutes,
  resistanceMinutes: 0,
  totalMinutes,
  volumeKg: 0,
  peakLoadKg: null,
  calciumMg: 0,
  vitaminDIu: 0,
});

describe("targets (all app defaults)", () => {
  it("the daily exercise target is the environment's, or 120 min without one", () => {
    expect(dailyExerciseTarget("lunar")).toEqual({ minutes: 90, environmentName: "Lunar surface" });
    expect(dailyExerciseTarget(null)).toEqual({ minutes: BONE_LIMITS.defaultDailyExerciseMin, environmentName: null });
    expect(BONE_LIMITS).toMatchObject({ calciumMgPerDay: 1000, vitaminDIuPerDay: 800 });
  });
});

describe("evaluateWeek (bone_exercise: Watch below 50 % of 7 × daily target)", () => {
  it("no-data without logs in the last 7 days", () => {
    expect(evaluateWeek([day("2026-11-01", 200)], TODAY, 120).status).toBe("no-data");
  });

  it("Watch below half the weekly target; Normal at or above", () => {
    // Weekly target 840 min, half = 420.
    const low = evaluateWeek([day("2026-11-12", 200), day("2026-11-14", 219)], TODAY, 120);
    expect(low).toMatchObject({ status: "watch", totalMinutes: 419, targetMinutes: 840, daysLogged: 2 });
    expect(low.reason).toBe("Exercise over the last 7 days is 419 min, below half the weekly target (840 min).");
    expect(evaluateWeek([day("2026-11-12", 200), day("2026-11-14", 220)], TODAY, 120).status).toBe("normal");
  });

  it("only the 7 days ending today count", () => {
    const r = evaluateWeek([day("2026-11-07", 500), day("2026-11-08", 100)], TODAY, 120);
    expect(r.totalMinutes).toBe(100);
  });
});

describe("sessionKind", () => {
  it.each([
    [{ aerobicMinutes: 30, resistanceMinutes: 20, loadKg: null }, "mixed"],
    [{ aerobicMinutes: 0, resistanceMinutes: 0, loadKg: 40 }, "resistive"],
    [{ aerobicMinutes: 45, resistanceMinutes: 0, loadKg: null }, "aerobic"],
    [{ aerobicMinutes: 0, resistanceMinutes: 0, loadKg: null }, "none"],
  ] as const)("%j → %s", (x, kind) => {
    expect(sessionKind(x)).toBe(kind);
  });
});

describe("boneInput", () => {
  const schema = boneInput(TODAY);
  const errors = (input: Record<string, string>) => {
    const r = schema.safeParse({ day: TODAY, ...input });
    return r.success ? {} : z.flattenError(r.error).fieldErrors;
  };
  it("accepts exercise only or intake only", () => {
    expect(schema.parse({ day: TODAY, aerobicMinutes: "45" })).toMatchObject({ aerobicMinutes: 45, calciumMg: null });
    expect(schema.parse({ day: TODAY, calciumMg: "500" })).toMatchObject({ calciumMg: 500, aerobicMinutes: null });
  });
  it("needs something to log, a load for reps, and no future days", () => {
    expect(errors({}).aerobicMinutes).toEqual(["Log some exercise or intake."]);
    expect(errors({ resistanceMinutes: "20", reps: "10" }).loadKg).toEqual(["Add the load (kg) for those reps."]);
    expect(errors({ day: "2026-11-15", aerobicMinutes: "10" }).day).toEqual(["The day can't be in the future."]);
    // The form shows the first message for a field.
    expect(errors({ aerobicMinutes: "-5" }).aerobicMinutes?.[0]).toBe("Aerobic minutes can't be negative.");
  });
});

describe("summarizeBone", () => {
  const row = (id: number, recordedAt: string, over: Partial<BoneRow> = {}): BoneRow => ({
    id,
    recordedAt,
    source: "manual",
    aerobicMinutes: null,
    resistanceMinutes: null,
    minutes: 0,
    loadKg: null,
    reps: null,
    calciumMg: null,
    vitaminDIu: null,
    note: null,
    ...over,
  });

  it("adds up several logs on one day: minutes, volume (kg × reps), peak load and intake", () => {
    const rows = [
      row(1, "2026-11-14T07:00:00Z", { aerobicMinutes: 40, minutes: 40, calciumMg: 400 }),
      row(2, "2026-11-14T18:00:00Z", { resistanceMinutes: 30, minutes: 30, loadKg: 60, reps: 30, calciumMg: 500, vitaminDIu: 800 }),
      row(3, "2026-11-14T19:00:00Z", { loadKg: 80, reps: 10 }),
    ];
    const [d] = boneDays(rows);
    expect(d).toMatchObject({ totalMinutes: 70, aerobicMinutes: 40, resistanceMinutes: 30, volumeKg: 2600, peakLoadKg: 80, calciumMg: 900, vitaminDIu: 800 });
    const s = summarizeBone(rows, TODAY, 120);
    expect(s.loggedToday).toBe(true);
    expect(s.tile).toEqual({ metric: "Exercise today", value: "70", unit: "min", status: "watch" }); // 70 < 420
    expect(s.history.map((h) => h.id)).toEqual([3, 2, 1]);
  });

  it("no tile without recent logs", () => {
    expect(summarizeBone([], TODAY, 120)).toMatchObject({ tile: null, loggedToday: false, week: { status: "no-data" } });
  });
});

describe("seedBoneSeries", () => {
  it("14 days ending yesterday that never raise bone_exercise in any environment", () => {
    for (let i = 0; i < 4; i++) {
      const rows = seedBoneSeries(i, TODAY).map((s, k) => ({ id: k, source: "seed" as const, ...s }));
      expect(rows.at(-1)!.recordedAt).toBe("2026-11-13T18:00:00.000Z");
      for (const target of [BONE_LIMITS.defaultDailyExerciseMin, ...MISSION_ENVIRONMENTS.map((m) => m.exerciseTargetMin)]) {
        expect(evaluateWeek(boneDays(rows), "2026-11-13", target).status).toBe("normal");
      }
    }
  });
});
