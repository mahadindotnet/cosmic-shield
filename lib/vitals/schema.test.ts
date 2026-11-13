import { describe, expect, it } from "vitest";
import { z } from "zod";
import { VitalsInput } from "./schema";

const form = { heartRate: "72", spo2: "98", systolic: "150", diastolic: "95", glucose: "" };
const errors = (input: Record<string, string>) => {
  const r = VitalsInput.safeParse(input);
  return r.success ? {} : z.flattenError(r.error).fieldErrors;
};

describe("VitalsInput", () => {
  it("parses form strings into numbers; blank glucose is null", () => {
    expect(VitalsInput.parse(form)).toEqual({ heartRate: 72, spo2: 98, systolic: 150, diastolic: 95, glucose: null });
    expect(VitalsInput.parse({ ...form, glucose: "92.5" }).glucose).toBe(92.5);
  });

  it("asks for missing required fields by name", () => {
    expect(errors({ ...form, heartRate: "" }).heartRate).toEqual(["Enter heart rate."]);
  });

  it("rejects out-of-range values, decimals and text", () => {
    expect(errors({ ...form, spo2: "101" }).spo2?.[0]).toBe("SpO₂ must be 50–100.");
    expect(errors({ ...form, heartRate: "72.5" }).heartRate?.[0]).toBe("heart rate must be a whole number.");
    expect(errors({ ...form, systolic: "abc" }).systolic?.[0]).toBe("systolic must be a number.");
    expect(errors({ ...form, glucose: "900" }).glucose?.[0]).toBe("Glucose must be 20–600.");
  });

  it("requires systolic above diastolic", () => {
    expect(errors({ ...form, systolic: "90", diastolic: "95" }).diastolic).toEqual(["Diastolic must be lower than systolic."]);
  });
});
