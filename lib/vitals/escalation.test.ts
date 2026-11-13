import { describe, expect, it } from "vitest";
import { evaluateVitals, type VitalsValues } from "./rules";
import { vitalsEscalation } from "./escalation";
import { summarizeVitals } from "./summary";

const ok: VitalsValues = { heartRate: 66, systolic: 118, diastolic: 74, spo2: 98, glucose: null };

describe("vitalsEscalation", () => {
  it("is null for Normal and Watch readings", () => {
    expect(vitalsEscalation(ok, evaluateVitals(ok))).toBeNull();
    const watch = { ...ok, systolic: 150, diastolic: 95 };
    expect(vitalsEscalation(watch, evaluateVitals(watch))).toBeNull();
  });

  it("builds an evidence record with the values, limits and citations", () => {
    const v = { ...ok, spo2: 88, systolic: 150 };
    const d = vitalsEscalation(v, evaluateVitals(v))!;
    expect(d.ruleId).toBe("vitals");
    expect(d.reason).toContain("SpO₂ 88 % is below the Escalate level (90 %).");
    expect(d.evidence.values).toEqual(v);
    expect(d.evidence.triggered).toContainEqual(
      expect.objectContaining({ measure: "spo2", level: "escalate", rule: "SpO₂ < 90 %", basis: "sourced", source: "who-pulse-oximetry-2011" }),
    );
    expect(d.evidence.triggered.find((t) => t.measure === "spo2")?.citation).toContain("A saturation of less than 90% is a clinical emergency.");
    // The Watch measure is in the evidence too, labelled as an app default.
    expect(d.evidence.triggered).toContainEqual(expect.objectContaining({ measure: "bloodPressure", level: "watch", basis: "app default" }));
  });
});

describe("dashboard tile", () => {
  it("shows the escalating measure ahead of a Watch one", () => {
    const s = summarizeVitals(
      [{ id: 1, recordedAt: "2026-11-13T08:00:00Z", source: "manual", ...ok, systolic: 150, spo2: 88 }],
      "2026-11-13",
    );
    expect(s.tile).toEqual({ metric: "SpO₂", value: "88", unit: "%", status: "escalate" });
  });
});
