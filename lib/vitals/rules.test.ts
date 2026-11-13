import { describe, expect, it } from "vitest";
import thresholds from "@/data/rules/thresholds.json";
import { evaluateVitals, VITALS_LIMITS, type VitalsValues } from "./rules";

const ok: VitalsValues = { heartRate: 66, systolic: 118, diastolic: 74, spo2: 98, glucose: 90 };
const t = thresholds.vitals;
const statusOf = (over: Partial<VitalsValues>) => evaluateVitals({ ...ok, ...over }).status;

describe("evaluateVitals: Watch (app defaults)", () => {
  it("is Normal when every measure is inside its band", () => {
    const e = evaluateVitals(ok);
    expect(e.status).toBe("normal");
    expect(e.reasons).toEqual([]);
    expect(e.checks.map((c) => c.status)).toEqual(["normal", "normal", "normal", "normal"]);
  });

  it("flags BP 150/95 as Watch and names both numbers", () => {
    const e = evaluateVitals({ ...ok, systolic: 150, diastolic: 95 });
    expect(e.status).toBe("watch");
    const bp = e.checks.find((c) => c.measure === "bloodPressure")!;
    expect(bp.display).toBe("150/95");
    expect(bp.reason).toContain(`Systolic 150 mmHg is at or above the Watch level (${t.systolicBp.watchHigh} mmHg).`);
    expect(bp.reason).toContain(`Diastolic 95 mmHg is at or above the Watch level (${t.diastolicBp.watchHigh} mmHg).`);
  });

  it("treats the app-default Watch levels as inclusive", () => {
    expect(statusOf({ heartRate: t.heartRateBpm.watchHigh })).toBe("watch");
    expect(statusOf({ heartRate: t.heartRateBpm.watchHigh - 1 })).toBe("normal");
    expect(statusOf({ heartRate: t.heartRateBpm.watchLow })).toBe("watch");
    expect(statusOf({ spo2: t.spo2Pct.watchLow })).toBe("watch");
    expect(statusOf({ spo2: t.spo2Pct.watchLow + 1 })).toBe("normal");
    expect(statusOf({ systolic: t.systolicBp.watchLow })).toBe("watch");
    expect(statusOf({ glucose: t.glucoseMgDl.watchHigh })).toBe("watch");
  });

  it("heart rate and blood pressure never escalate (no verified source)", () => {
    expect(statusOf({ heartRate: 190 })).toBe("watch");
    expect(statusOf({ systolic: 220, diastolic: 130 })).toBe("watch");
    expect(VITALS_LIMITS.heartRate.every((l) => l.level === "watch")).toBe(true);
    expect([...VITALS_LIMITS.systolic, ...VITALS_LIMITS.diastolic].every((l) => l.level === "watch")).toBe(true);
  });
});

describe("evaluateVitals: SpO₂ (WHO: < 90 % is a clinical emergency)", () => {
  it("escalates below 90 %, not at 90 %", () => {
    expect(statusOf({ spo2: 89 })).toBe("escalate");
    expect(statusOf({ spo2: 88 })).toBe("escalate");
    expect(statusOf({ spo2: 90 })).toBe("watch");
  });

  it("explains the escalation and cites WHO", () => {
    const e = evaluateVitals({ ...ok, spo2: 88 });
    const spo2 = e.checks.find((c) => c.measure === "spo2")!;
    expect(spo2.reason).toBe("SpO₂ 88 % is below the Escalate level (90 %).");
    expect(spo2.triggered[0]).toMatchObject({ level: "escalate", basis: "sourced", source: "who-pulse-oximetry-2011" });
  });
});

describe("evaluateVitals: glucose (ADA hypoglycaemia levels)", () => {
  it("level 2 (< 54 mg/dL) escalates; 54 is level 1", () => {
    expect(statusOf({ glucose: 53 })).toBe("escalate");
    expect(statusOf({ glucose: 54 })).toBe("watch");
  });

  it("level 1 (< 70 mg/dL) is Watch; 70 is Normal", () => {
    expect(statusOf({ glucose: 69 })).toBe("watch");
    expect(statusOf({ glucose: 70 })).toBe("normal");
    const g = evaluateVitals({ ...ok, glucose: 60 }).checks.find((c) => c.measure === "glucose")!;
    expect(g.triggered[0]).toMatchObject({ level: "watch", basis: "sourced", source: "ada-hypoglycemia-levels-2025" });
  });

  it("checks glucose only when it was measured", () => {
    expect(evaluateVitals({ ...ok, glucose: null }).checks.map((c) => c.measure)).not.toContain("glucose");
  });
});

describe("evaluateVitals: combined", () => {
  it("the reading takes the worst status and lists the Escalate reason first", () => {
    const e = evaluateVitals({ ...ok, systolic: 150, spo2: 87 });
    expect(e.status).toBe("escalate");
    expect(e.reasons[0]).toContain("SpO₂ 87 %");
    expect(e.reasons[1]).toContain("Systolic 150 mmHg");
  });
});
