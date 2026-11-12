import { describe, expect, it } from "vitest";
import { radiationReference } from "./radiation";
import { MISSION_ENVIRONMENTS } from "@/lib/mission/environments";

describe("radiationReference (committed fixture)", () => {
  it("uses measured RadLab dose equivalent for the ISS", () => {
    const iss = radiationReference("iss");
    expect(iss.basis).toBe("measured");
    expect(iss.sourceLabel).toContain("ALTEA-Survey");
    expect(iss.mSvPerDay).toBeGreaterThan(0.5);
    expect(iss.mSvPerDay).toBeLessThan(1);
  });

  it("uses the published values elsewhere", () => {
    expect(radiationReference("mars_transit")).toMatchObject({ basis: "published", mSvPerDay: 1.84 });
    expect(radiationReference("mars_surface")).toMatchObject({ basis: "published", mSvPerDay: 0.64 });
    expect(radiationReference("lunar_surface")).toMatchObject({ basis: "published", mSvPerDay: 1.369 });
  });

  it("refuses lunar orbit, which has no dose equivalent", () => {
    expect(() => radiationReference("lunar_orbit")).toThrow();
  });
});

describe("mission environments", () => {
  it("offer ISS, lunar surface, Mars transit and Mars surface with sourced doses", () => {
    expect(MISSION_ENVIRONMENTS.map((m) => m.name)).toEqual(["ISS", "Lunar surface", "Mars transit", "Mars surface"]);
    for (const m of MISSION_ENVIRONMENTS) {
      expect(m.radiationMsvPerDay).toBe(Math.round(m.radiation.mSvPerDay * 100) / 100);
      expect(m.radiationWatchMsvPerDay).toBe(Math.round(m.radiation.mSvPerDay * 20) / 10);
    }
  });
});
