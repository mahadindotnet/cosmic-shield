import { describe, expect, it } from "vitest";
import { buildMonth } from "./streak-panel";

describe("buildMonth (one-month check-in calendar)", () => {
  it("lays out the current month Sunday-first, with future days marked", () => {
    const m = buildMonth("2026-11-12", {});
    expect(m.title).toBe("November 2026");
    // 1 Nov 2026 is a Sunday, so there are no leading blanks.
    expect(m.cells[0]).toMatchObject({ date: "2026-11-01", day: 1 });
    expect(m.cells.filter((c) => c !== null)).toHaveLength(30);
    expect(m.cells.find((c) => c?.isToday)?.date).toBe("2026-11-12");
    expect(m.cells.find((c) => c?.date === "2026-11-13")?.future).toBe(true);
    expect(m.daysSoFar).toBe(12);
  });

  it("pads to the first weekday", () => {
    const m = buildMonth("2026-12-05", {});
    // 1 Dec 2026 is a Tuesday: two blanks (Sun, Mon).
    expect(m.cells.slice(0, 3)).toEqual([null, null, expect.objectContaining({ day: 1 })]);
  });

  it("counts totals, active days and streaks; today may still be pending", () => {
    const checkins = {
      "2026-10-30": 1,
      "2026-10-31": 1,
      "2026-11-01": 2,
      "2026-11-03": 1,
      "2026-11-09": 1,
      "2026-11-10": 1,
      "2026-11-11": 1,
    };
    const m = buildMonth("2026-11-12", checkins);
    expect(m.total).toBe(6);
    expect(m.activeDays).toBe(5);
    expect(m.maxStreak).toBe(3); // 9-11 Nov
    expect(m.streak).toBe(3); // today not checked in yet, streak still alive
    expect(m.checkedToday).toBe(false);
    // A streak that started last month carries over.
    expect(buildMonth("2026-11-01", checkins).streak).toBe(3);
  });

  it("renders a neutral grid on the server", () => {
    const m = buildMonth(null, {});
    expect(m.cells.every((c) => c === null)).toBe(true);
    expect(m.total).toBe(0);
  });
});
