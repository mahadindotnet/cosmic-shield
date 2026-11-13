import { describe, expect, it } from "vitest";
import { addDays, dailySeries, summarizeVitals, type VitalsRow } from "./summary";

const row = (id: number, recordedAt: string, over: Partial<VitalsRow> = {}): VitalsRow => ({
  id,
  recordedAt,
  source: "seed",
  heartRate: 66,
  systolic: 118,
  diastolic: 74,
  spo2: 98,
  glucose: null,
  ...over,
});

describe("addDays", () => {
  it("crosses month and year boundaries in UTC", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("dailySeries", () => {
  it("averages each UTC day, leaves gaps null and ends today", () => {
    const rows = [
      row(1, "2026-11-13T07:00:00Z", { heartRate: 60 }),
      row(2, "2026-11-13T19:00:00Z", { heartRate: 71 }),
      row(3, "2026-11-11T07:00:00Z", { heartRate: 80 }),
      row(4, "2026-10-01T07:00:00Z", { heartRate: 99 }),
    ];
    expect(dailySeries(rows, "heartRate", "2026-11-13", 3)).toEqual([
      { day: "2026-11-11", label: "11 Nov", value: 80 },
      { day: "2026-11-12", label: "12 Nov", value: null },
      { day: "2026-11-13", label: "13 Nov", value: 65.5 },
    ]);
  });
});

describe("summarizeVitals", () => {
  it("is empty without rows", () => {
    const s = summarizeVitals([], "2026-11-13");
    expect(s.latest).toBeNull();
    expect(s.tile).toBeNull();
    expect(s.history).toEqual([]);
    expect(s.trends.heartRate).toHaveLength(14);
  });

  it("puts the newest reading first and shows the flagged measure on the tile", () => {
    const s = summarizeVitals(
      [row(1, "2026-11-12T07:30:00Z"), row(2, "2026-11-13T09:00:00Z", { source: "manual", systolic: 150, diastolic: 95 })],
      "2026-11-13",
    );
    expect(s.history.map((h) => [h.id, h.status])).toEqual([
      [2, "watch"],
      [1, "normal"],
    ]);
    expect(s.latest?.id).toBe(2);
    expect(s.tile).toEqual({ metric: "Blood pressure", value: "150/95", unit: "mmHg", status: "watch" });
  });

  it("shows heart rate on the tile when the latest reading is Normal", () => {
    expect(summarizeVitals([row(1, "2026-11-13T07:30:00Z", { heartRate: 64 })], "2026-11-13").tile).toEqual({
      metric: "Heart rate",
      value: "64",
      unit: "bpm",
      status: "normal",
    });
  });
});
