import { describe, expect, it } from "vitest";
import { z } from "zod";
import { demoNightlySeries, NIGHTLY_PROFILES } from "@/lib/demo/nightly";
import { evaluateHrvSleepDecline } from "@/lib/rules/hrv-sleep-decline";
import { addDays } from "@/lib/vitals/summary";
import { evaluateSleep, SLEEP_LIMITS } from "./rules";
import { sleepInput } from "./schema";
import { currentPerNight, summarizeSleep, toNightly, type SleepRow } from "./summary";

const TODAY = "2026-11-13";
const LAST_NIGHT = "2026-11-12";

const seedRows = (profile: string): SleepRow[] =>
  demoNightlySeries(profile, TODAY).map((n, i) => ({
    id: i + 1,
    night: n.night,
    createdAt: "2026-11-13T00:00:00.000Z",
    source: "seed",
    sleepHours: n.sleepHours,
    hrvRmssd: n.hrvMs,
    quality: n.quality,
    stress: n.stress,
  }));

describe("evaluateSleep (app defaults)", () => {
  const ok = { sleepHours: 7.2, quality: 4, hrvRmssd: 42, stress: 2 };

  it("is Normal for a good night", () => {
    expect(evaluateSleep(ok)).toMatchObject({ status: "normal", reasons: [] });
  });

  it("flags short sleep, low HRV and high stress as Watch, inclusive", () => {
    expect(evaluateSleep({ ...ok, sleepHours: SLEEP_LIMITS.sleepHoursWatchLow }).reasons).toEqual([
      `Sleep ${SLEEP_LIMITS.sleepHoursWatchLow} h is at or below the Watch level (${SLEEP_LIMITS.sleepHoursWatchLow} h).`,
    ]);
    expect(evaluateSleep({ ...ok, hrvRmssd: SLEEP_LIMITS.hrvWatchLow }).status).toBe("watch");
    expect(evaluateSleep({ ...ok, stress: SLEEP_LIMITS.stressWatchHigh }).status).toBe("watch");
    expect(evaluateSleep({ ...ok, stress: SLEEP_LIMITS.stressWatchHigh - 1 }).status).toBe("normal");
  });

  it("skips HRV and stress when not given; never escalates", () => {
    const e = evaluateSleep({ sleepHours: 2, quality: null, hrvRmssd: null, stress: null });
    expect(e.checks.map((c) => c.measure)).toEqual(["sleepHours"]);
    expect(e.status).toBe("watch");
  });
});

describe("sleepInput", () => {
  const schema = sleepInput(TODAY);
  const form = { night: LAST_NIGHT, sleepHours: "7.5", quality: "4", hrvRmssd: "", stress: "2" };
  const errors = (over: Record<string, string>) => {
    const r = schema.safeParse({ ...form, ...over });
    return r.success ? {} : z.flattenError(r.error).fieldErrors;
  };

  it("parses a night; blank HRV is null", () => {
    expect(schema.parse(form)).toEqual({ night: LAST_NIGHT, sleepHours: 7.5, quality: 4, hrvRmssd: null, stress: 2 });
  });

  it("rejects future and too-old nights, out-of-range and missing ratings", () => {
    expect(errors({ night: "2026-11-14" }).night).toEqual(["The night can't be in the future."]);
    expect(errors({ night: "2026-10-01" }).night).toEqual(["Only the last 30 nights can be logged."]);
    expect(errors({ sleepHours: "17" }).sleepHours).toEqual(["sleep must be 0–16."]);
    expect(errors({ stress: "6" }).stress).toEqual(["stress must be 1–5."]);
    expect(errors({ quality: "" }).quality).toEqual(["Enter sleep quality."]);
  });
});

describe("summarizeSleep", () => {
  it("uses the newest entry per night; older ones stay in history marked replaced", () => {
    const rows: SleepRow[] = [
      ...seedRows("reyes"),
      { id: 100, night: LAST_NIGHT, createdAt: "2026-11-13T09:00:00.000Z", source: "manual", sleepHours: 4.5, quality: 2, hrvRmssd: 30, stress: 4 },
    ];
    expect(currentPerNight(rows).at(-1)!.id).toBe(100);
    const s = summarizeSleep(rows, TODAY);
    expect(s.latest?.id).toBe(100);
    expect(s.tile).toEqual({ value: "4.5", unit: "h", status: "watch", night: LAST_NIGHT });
    expect(s.history).toHaveLength(15);
    expect(s.history[0]).toMatchObject({ id: 100, current: true });
    expect(s.history.find((h) => h.night === LAST_NIGHT && h.source === "seed")?.current).toBe(false);
    expect(s.trends.sleepHours).toHaveLength(14);
    expect(s.trends.sleepHours.at(-1)).toMatchObject({ day: LAST_NIGHT, value: 4.5 });
  });

  it("is empty without rows", () => {
    expect(summarizeSleep([], TODAY)).toMatchObject({ latest: null, tile: null, history: [], hrvBand: null });
  });
});

describe("hrv_sleep_decline on sleep_entry rows", () => {
  it("fires for CS-003's seeded nights and for nobody else's", () => {
    expect(evaluateHrvSleepDecline(toNightly(seedRows("lindqvist")), TODAY).fired).toBe(true);
    for (const p of ["reyes", "okafor", "tanaka"]) expect(evaluateHrvSleepDecline(toNightly(seedRows(p)), TODAY).fired).toBe(false);
  });

  it("fires when 3 low nights are entered by hand over a normal seed (the e2e scenario)", () => {
    const manual: SleepRow[] = [3, 2, 1].map((back, i) => ({
      id: 200 + i,
      night: addDays(TODAY, -back),
      createdAt: "2026-11-13T09:00:00.000Z",
      source: "manual",
      sleepHours: 4.5,
      quality: 2,
      hrvRmssd: 28,
      stress: 4,
    }));
    const r = evaluateHrvSleepDecline(toNightly([...seedRows("reyes"), ...manual]), TODAY);
    expect(r.fired).toBe(true);
    expect(r.flagged.map((f) => f.night)).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"]);
  });
});

describe("demo nightly variation", () => {
  const stats = (xs: number[]) => {
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    return { mean: m, sd: Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)) };
  };

  it("is configured at RMSSD CV 8–12 % and sleep SD 0.4–0.6 h", () => {
    for (const p of Object.values(NIGHTLY_PROFILES)) {
      expect(p.hrvCv).toBeGreaterThanOrEqual(0.08);
      expect(p.hrvCv).toBeLessThanOrEqual(0.12);
      expect(p.sleepSd).toBeGreaterThanOrEqual(0.4);
      expect(p.sleepSd).toBeLessThanOrEqual(0.6);
    }
  });

  it("produces visibly varying nights (not flat), and every normal night is Normal", () => {
    for (const id of Object.keys(NIGHTLY_PROFILES)) {
      const normal = demoNightlySeries(id, TODAY).slice(0, 11);
      const h = stats(normal.map((n) => n.hrvMs));
      const s = stats(normal.map((n) => n.sleepHours));
      expect(h.sd / h.mean).toBeGreaterThan(0.05);
      expect(h.sd / h.mean).toBeLessThan(0.15);
      expect(s.sd).toBeGreaterThan(0.3);
      expect(s.sd).toBeLessThan(0.7);
      for (const n of normal) expect(evaluateSleep({ sleepHours: n.sleepHours, quality: n.quality, hrvRmssd: n.hrvMs, stress: n.stress }).status).toBe("normal");
    }
  });
});
