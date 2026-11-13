import { describe, expect, it } from "vitest";
import { evaluateVitals } from "./rules";
import { seedVitalsSeries } from "./seed-data";

describe("seedVitalsSeries", () => {
  it("gives 14 mornings ending yesterday, relative to today", () => {
    const s = seedVitalsSeries(0, "2026-11-13");
    expect(s).toHaveLength(14);
    expect(s[0].recordedAt).toBe("2026-10-30T07:30:00.000Z");
    expect(s[13].recordedAt).toBe("2026-11-12T07:30:00.000Z");
  });

  it("is deterministic and never raises a status on its own", () => {
    for (let crew = 0; crew < 4; crew++) {
      const a = seedVitalsSeries(crew, "2026-11-13");
      expect(seedVitalsSeries(crew, "2026-11-13")).toEqual(a);
      for (const v of a) expect(evaluateVitals(v).status).toBe("normal");
    }
  });
});
