import { describe, expect, it } from "vitest";
import thresholds from "@/data/rules/thresholds.json";
import { evaluateVitals, type VitalsValues } from "./rules";

const ok: VitalsValues = { heartRate: 66, systolic: 118, diastolic: 74, spo2: 98, glucose: 90 };
const t = thresholds.vitals;

describe("evaluateVitals", () => {
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
    expect(bp.status).toBe("watch");
    expect(bp.reason).toContain(`Systolic 150 mmHg is at or above the Watch level (${t.systolicBp.watchHigh} mmHg).`);
    expect(bp.reason).toContain(`Diastolic 95 mmHg is at or above the Watch level (${t.diastolicBp.watchHigh} mmHg).`);
  });

  it("treats the Watch levels as inclusive", () => {
    expect(evaluateVitals({ ...ok, heartRate: t.heartRateBpm.watchHigh }).status).toBe("watch");
    expect(evaluateVitals({ ...ok, heartRate: t.heartRateBpm.watchHigh - 1 }).status).toBe("normal");
    expect(evaluateVitals({ ...ok, heartRate: t.heartRateBpm.watchLow }).status).toBe("watch");
    expect(evaluateVitals({ ...ok, spo2: t.spo2Pct.watchLow }).status).toBe("watch");
    expect(evaluateVitals({ ...ok, spo2: t.spo2Pct.watchLow + 1 }).status).toBe("normal");
    expect(evaluateVitals({ ...ok, systolic: t.systolicBp.watchLow }).status).toBe("watch");
  });

  it("checks glucose only when it was measured", () => {
    expect(evaluateVitals({ ...ok, glucose: null }).checks.map((c) => c.measure)).not.toContain("glucose");
    expect(evaluateVitals({ ...ok, glucose: t.glucoseMgDl.watchHigh }).status).toBe("watch");
    expect(evaluateVitals({ ...ok, glucose: t.glucoseMgDl.watchLow }).status).toBe("watch");
  });

  it("never escalates (vitals rules are Watch-only)", () => {
    const e = evaluateVitals({ heartRate: 180, systolic: 220, diastolic: 130, spo2: 80, glucose: 500 });
    expect(e.status).toBe("watch");
    expect(e.reasons).toHaveLength(4);
  });
});
