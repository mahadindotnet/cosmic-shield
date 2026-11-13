import { describe, expect, it } from "vitest";
import { demoNightlySeries } from "@/lib/demo/nightly";
import {
  evaluateHrvSleepDecline,
  HRV_SLEEP_DECLINE_CONFIG as CFG,
  HRV_SLEEP_DECLINE_ID,
  type NightlyReading,
} from "./hrv-sleep-decline";

const TODAY = "2026-11-13";
const DAY = 86_400_000;
const night = (daysAgo: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - daysAgo * DAY).toISOString().slice(0, 10);

/** 11 baseline nights (HRV 50 ms, sleep 7.2 h), then the given last 3 nights. */
function series(last: [number, number][], baseline = { hrv: 50, sleep: 7.2 }, baselineNights = 11): NightlyReading[] {
  const total = baselineNights + last.length;
  return Array.from({ length: total }, (_, i) => {
    const daysAgo = total - i;
    const k = i - baselineNights;
    return k >= 0
      ? { night: night(daysAgo), hrvMs: last[k][0], sleepHours: last[k][1] }
      : { night: night(daysAgo), hrvMs: baseline.hrv, sleepHours: baseline.sleep };
  });
}

describe("hrv_sleep_decline", () => {
  it("uses the documented app-heuristic thresholds", () => {
    expect(CFG).toEqual({
      baselineDays: 14,
      minBaselineNights: 7,
      flaggedNights: 3,
      hrvDropPct: 10,
      sleepDropHours: 0.5,
      sleepFloorHours: 6,
      maxNightAgeDays: 2,
    });
  });

  it("fires as Watch with per-night numbers vs the personal baseline", () => {
    const r = evaluateHrvSleepDecline(series([[41, 5.4], [39, 5.1], [40, 5.3]]), TODAY);
    expect(r.fired).toBe(true);
    expect(r.status).toBe("watch");
    expect(r.ruleId).toBe(HRV_SLEEP_DECLINE_ID);
    expect(r.basis).toBe("app heuristic");
    expect(r.baseline).toMatchObject({ start: night(14), end: night(4) });
    expect(r.baseline!.hrv.mean).toBe(50);
    expect(r.baseline!.sleep.mean).toBeCloseTo(7.2, 10);
    expect(r.flagged.map((f) => f.hrvPctVsBaseline)).toEqual([-18, -22, -20]);
    expect(r.flagged.map((f) => f.night)).toEqual([night(3), night(2), night(1)]);
    expect(r.flagged[1].sleepVsBaselineHours).toBeCloseTo(-2.1, 10);
    expect(r.sleepAvg).toBeCloseTo(5.27, 2);
    expect(r.sleepCondition).toBe("both");
    expect(r.citations.map((c) => c.url ?? c.source)).toEqual([
      "https://humanresearchroadmap.nasa.gov/Risks/?i=100",
      "Cosmic Shield, docs/rules.md",
    ]);
    expect(r.recent).toHaveLength(7);
  });

  it("needs all three nights below baseline by at least 10%", () => {
    const twoNights = evaluateHrvSleepDecline(series([[48, 5.4], [39, 5.1], [40, 5.3]]), TODAY);
    expect(twoNights.fired).toBe(false);
    expect(twoNights.reason).toBe("hrv_not_below_baseline");
    // 9% below is not enough; exactly 10% is.
    expect(evaluateHrvSleepDecline(series([[45.5, 5], [45.5, 5], [45.5, 5]]), TODAY).fired).toBe(false);
    expect(evaluateHrvSleepDecline(series([[45, 5], [45, 5], [45, 5]]), TODAY).fired).toBe(true);
  });

  it("does not fire when HRV drops but sleep holds", () => {
    const r = evaluateHrvSleepDecline(series([[40, 7.0], [39, 7.1], [40, 6.9]]), TODAY);
    expect(r.fired).toBe(false);
    expect(r.reason).toBe("sleep_not_below_baseline");
    expect(r.flagged).toHaveLength(3); // numbers are still reported
  });

  it("fires on the 6-hour floor even when the personal baseline is low", () => {
    const r = evaluateHrvSleepDecline(series([[40, 5.8], [39, 5.9], [40, 5.8]], { hrv: 50, sleep: 6.1 }), TODAY);
    expect(r.fired).toBe(true);
    expect(r.sleepCondition).toBe("below_floor");
  });

  it("fires on the personal baseline even above 6 hours", () => {
    const r = evaluateHrvSleepDecline(series([[40, 7.4], [39, 7.5], [40, 7.4]], { hrv: 50, sleep: 8.2 }), TODAY);
    expect(r.fired).toBe(true);
    expect(r.sleepCondition).toBe("below_baseline");
  });

  it("requires consecutive nights", () => {
    const s = series([[41, 5.4], [39, 5.1], [40, 5.3]]);
    const gap = s.filter((n) => n.night !== night(2));
    gap.push({ night: night(5), hrvMs: 50, sleepHours: 7.2 });
    const r = evaluateHrvSleepDecline([...gap, { night: night(1), hrvMs: 40, sleepHours: 5.3 }], TODAY);
    expect(r.reason).toBe("not_consecutive");
  });

  it("requires at least 7 baseline nights", () => {
    expect(evaluateHrvSleepDecline(series([[41, 5.4], [39, 5.1], [40, 5.3]], undefined, 6), TODAY).reason).toBe(
      "insufficient_baseline",
    );
    expect(evaluateHrvSleepDecline(series([[41, 5.4], [39, 5.1], [40, 5.3]], undefined, 7), TODAY).fired).toBe(true);
  });

  it("ignores stale data: only the last 2 nights count as current", () => {
    const s = series([[41, 5.4], [39, 5.1], [40, 5.3]]); // last night = yesterday
    expect(evaluateHrvSleepDecline(s, night(-1)).fired).toBe(true); // last night = 2 days ago
    expect(evaluateHrvSleepDecline(s, night(-2)).reason).toBe("stale"); // 3 days ago
  });

  it("handles no data", () => {
    expect(evaluateHrvSleepDecline([], TODAY).reason).toBe("no_data");
  });
});

describe("demo nightly seed", () => {
  it("is deterministic and ends last night", () => {
    const a = demoNightlySeries("lindqvist", TODAY);
    expect(a).toEqual(demoNightlySeries("lindqvist", TODAY));
    expect(a).toHaveLength(14);
    expect(a.at(-1)!.night).toBe(night(1));
  });

  it("gives CS-003 Lindqvist the pattern (HRV 15-25% down, sleep 5-5.5 h) and nobody else", () => {
    const r = evaluateHrvSleepDecline(demoNightlySeries("lindqvist", TODAY), TODAY);
    expect(r.fired).toBe(true);
    for (const f of r.flagged) {
      expect(f.hrvPctVsBaseline).toBeLessThanOrEqual(-15);
      expect(f.hrvPctVsBaseline).toBeGreaterThanOrEqual(-25);
      expect(f.sleepHours).toBeGreaterThanOrEqual(5);
      expect(f.sleepHours).toBeLessThanOrEqual(5.5);
    }
    for (const id of ["reyes", "okafor", "tanaka"]) {
      expect(evaluateHrvSleepDecline(demoNightlySeries(id, TODAY), TODAY).fired).toBe(false);
    }
  });
});
