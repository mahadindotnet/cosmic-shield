import thresholds from "@/data/rules/thresholds.json";
import { addDays } from "@/lib/vitals/summary";

/**
 * Points and streaks from real activity (pure, tested in rules.test.ts).
 * App defaults in data/rules/thresholds.json `gamification`; motivation only,
 * never a health status.
 *
 * - Points: each activity earns its points once per UTC day (the first entry
 *   counts; logging the same thing again the same day earns nothing more).
 * - Streak: consecutive UTC days with a daily check-in. The current streak
 *   counts back from today, or from yesterday while today's check-in is open.
 * - Streak bonuses: every run that reaches 7 days earns +20 once, 30 days +50.
 */

export const ACTIVITIES = ["checkin", "vitals", "sleep", "dose", "exercise"] as const;
export type Activity = (typeof ACTIVITIES)[number];

const g = thresholds.gamification;
export const GAMIFICATION_RULES = {
  pointsPerDay: g.pointsPerDay as Record<Activity, number>,
  streakActivity: g.streakActivity as Activity,
  streakBonuses: g.streakBonuses as { days: number; points: number }[],
} as const;

export interface ActivityDay {
  activity: Activity;
  /** YYYY-MM-DD (UTC). */
  day: string;
}

export interface GamificationSummary {
  points: number;
  /** Points per activity: days with that activity × its daily points. */
  byActivity: Record<Activity, { days: number; points: number }>;
  bonusPoints: number;
  /** Current check-in streak (days). */
  streak: number;
  /** Longest check-in streak ever (days). */
  best: number;
  checkedInToday: boolean;
  /** Check-ins per day (for the streak calendar). */
  checkinsByDay: Record<string, number>;
  /** How many different activities were logged each day (0–5), for the calendar's colour. */
  activitiesByDay: Record<string, number>;
  /** Days with an exercise session in the current UTC month. */
  exerciseDaysThisMonth: number;
}

/** The length of every run of consecutive days, from a sorted list of unique days. */
export function runs(days: readonly string[]): number[] {
  const out: number[] = [];
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    if (prev !== null && addDays(prev, 1) === d) run++;
    else {
      if (run) out.push(run);
      run = 1;
    }
    prev = d;
  }
  if (run) out.push(run);
  return out;
}

export function computeGamification(entries: readonly ActivityDay[], today: string): GamificationSummary {
  const daysByActivity = Object.fromEntries(ACTIVITIES.map((a) => [a, new Set<string>()])) as Record<Activity, Set<string>>;
  const checkinsByDay: Record<string, number> = {};
  for (const e of entries) {
    if (e.day > today) continue;
    daysByActivity[e.activity].add(e.day);
    if (e.activity === GAMIFICATION_RULES.streakActivity) checkinsByDay[e.day] = (checkinsByDay[e.day] ?? 0) + 1;
  }

  const byActivity = Object.fromEntries(
    ACTIVITIES.map((a) => [a, { days: daysByActivity[a].size, points: daysByActivity[a].size * GAMIFICATION_RULES.pointsPerDay[a] }]),
  ) as GamificationSummary["byActivity"];

  const streakDays = [...daysByActivity[GAMIFICATION_RULES.streakActivity]].sort();
  const allRuns = runs(streakDays);
  const best = allRuns.length ? Math.max(...allRuns) : 0;
  const bonusPoints = allRuns.reduce((sum, r) => sum + GAMIFICATION_RULES.streakBonuses.filter((b) => r >= b.days).reduce((s, b) => s + b.points, 0), 0);

  const set = daysByActivity[GAMIFICATION_RULES.streakActivity];
  const checkedInToday = set.has(today);
  let streak = 0;
  for (let d = checkedInToday ? today : addDays(today, -1); set.has(d); d = addDays(d, -1)) streak++;

  const activitiesByDay: Record<string, number> = {};
  for (const a of ACTIVITIES) for (const d of daysByActivity[a]) activitiesByDay[d] = (activitiesByDay[d] ?? 0) + 1;

  const month = today.slice(0, 7);
  return {
    points: ACTIVITIES.reduce((s, a) => s + byActivity[a].points, 0) + bonusPoints,
    byActivity,
    bonusPoints,
    streak,
    best,
    checkedInToday,
    checkinsByDay,
    activitiesByDay,
    exerciseDaysThisMonth: [...daysByActivity.exercise].filter((d) => d.startsWith(month)).length,
  };
}
