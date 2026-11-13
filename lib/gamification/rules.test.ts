import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/vitals/summary";
import { computeGamification, GAMIFICATION_RULES, runs, type Activity, type ActivityDay } from "./rules";

const TODAY = "2026-11-14";
const days = (activity: Activity, from: string, n: number): ActivityDay[] => Array.from({ length: n }, (_, i) => ({ activity, day: addDays(from, i) }));

describe("runs", () => {
  it("splits sorted days into consecutive runs", () => {
    expect(runs([])).toEqual([]);
    expect(runs(["2026-11-01", "2026-11-02", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-09"])).toEqual([2, 3, 1]);
    expect(runs(["2026-10-31", "2026-11-01"])).toEqual([2]); // across months
  });
});

describe("computeGamification", () => {
  it("is all zero without activity", () => {
    expect(computeGamification([], TODAY)).toMatchObject({ points: 0, streak: 0, best: 0, checkedInToday: false, bonusPoints: 0 });
  });

  it("each activity earns its points once per UTC day", () => {
    const g = computeGamification(
      [
        { activity: "checkin", day: TODAY },
        { activity: "checkin", day: TODAY }, // second check-in the same day: no extra points
        { activity: "vitals", day: TODAY },
        { activity: "vitals", day: TODAY },
        { activity: "sleep", day: TODAY },
        { activity: "dose", day: TODAY },
        { activity: "exercise", day: TODAY },
      ],
      TODAY,
    );
    const p = GAMIFICATION_RULES.pointsPerDay;
    expect(g.points).toBe(p.checkin + p.vitals + p.sleep + p.dose + p.exercise);
    expect(g.byActivity.vitals).toEqual({ days: 1, points: p.vitals });
    expect(g.checkinsByDay[TODAY]).toBe(2);
    expect(g.activitiesByDay[TODAY]).toBe(5);
    expect(g.exerciseDaysThisMonth).toBe(1);
  });

  it("current streak counts back from yesterday while today is open, and includes today once checked in", () => {
    const five = days("checkin", "2026-11-09", 5); // 9–13 Nov
    expect(computeGamification(five, TODAY)).toMatchObject({ streak: 5, best: 5, checkedInToday: false });
    expect(computeGamification([...five, { activity: "checkin", day: TODAY }], TODAY)).toMatchObject({ streak: 6, checkedInToday: true });
  });

  it("a missed day breaks the current streak; best streak covers all history", () => {
    const g = computeGamification([...days("checkin", "2026-09-01", 12), ...days("checkin", "2026-11-11", 2)], TODAY);
    expect(g.streak).toBe(0); // 11–12 Nov, then nothing on 13 Nov
    expect(g.best).toBe(12);
  });

  it("only check-ins make the streak; other activities still earn points", () => {
    const g = computeGamification(days("vitals", "2026-11-01", 14), TODAY);
    expect(g.streak).toBe(0);
    expect(g.points).toBe(14 * GAMIFICATION_RULES.pointsPerDay.vitals);
  });

  it("streak bonuses are earned once per run that reaches 7 and 30 days", () => {
    const [b7, b30] = GAMIFICATION_RULES.streakBonuses;
    expect(computeGamification(days("checkin", "2026-11-07", 7), TODAY).bonusPoints).toBe(b7.points);
    expect(computeGamification([...days("checkin", "2026-08-01", 31), ...days("checkin", "2026-11-01", 8)], TODAY).bonusPoints).toBe(
      b7.points + b30.points + b7.points,
    );
    expect(computeGamification(days("checkin", "2026-11-08", 6), TODAY).bonusPoints).toBe(0);
  });

  it("ignores entries dated after today", () => {
    expect(computeGamification([{ activity: "checkin", day: "2026-11-15" }], TODAY).points).toBe(0);
  });
});
