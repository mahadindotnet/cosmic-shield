/**
 * Early-warning pattern rule `hrv_sleep_decline` (pure and deterministic).
 *
 * Fires when HRV (RMSSD, ms) is clearly below the crew member's OWN 14-day
 * baseline on each of the last 3 consecutive nights, and their average sleep
 * over those nights is below their own baseline (or below 6 h). It is a
 * Watch only and never escalates on its own. Every threshold is an app
 * heuristic, documented in docs/rules.md and set in data/rules/thresholds.json.
 */
import thresholds from "@/data/rules/thresholds.json";

export const HRV_SLEEP_DECLINE_ID = "hrv_sleep_decline" as const;

/** One night of data. `night` is the date the sleep period started (YYYY-MM-DD, UTC). */
export interface NightlyReading {
  night: string;
  /** HRV as RMSSD, milliseconds. */
  hrvMs: number | null;
  sleepHours: number | null;
}

export interface HrvSleepDeclineConfig {
  baselineDays: number;
  minBaselineNights: number;
  flaggedNights: number;
  hrvDropPct: number;
  sleepDropHours: number;
  sleepFloorHours: number;
  /** The most recent night must be at most this many days before today. */
  maxNightAgeDays: number;
}

const t = thresholds.patterns.hrvSleepDecline;
export const HRV_SLEEP_DECLINE_CONFIG: HrvSleepDeclineConfig = {
  baselineDays: t.baselineDays,
  minBaselineNights: t.minBaselineNights,
  flaggedNights: t.flaggedNights,
  hrvDropPct: t.hrvDropPct,
  sleepDropHours: t.sleepDropHours,
  sleepFloorHours: t.sleepFloorHours,
  maxNightAgeDays: t.maxNightAgeDays,
};

export interface Citation {
  title: string;
  source: string;
  url?: string;
  note: string;
}

export const HRV_SLEEP_DECLINE_CITATIONS: Citation[] = [
  {
    title:
      "Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload",
    source:
      "NASA Human Research Program, Human Research Roadmap (short title: Sleep)",
    url: "https://humanresearchroadmap.nasa.gov/Risks/?i=100",
    note: "Why sleep and recovery are monitored. It does not set these thresholds.",
  },
  {
    title: "Rule hrv_sleep_decline: thresholds and rationale",
    source: "Cosmic Shield, docs/rules.md",
    note: "All thresholds are app heuristics based on the crew member's own baseline, not population norms.",
  },
];

export type DeclineReason =
  | "fired"
  | "no_data"
  | "stale"
  | "not_consecutive"
  | "insufficient_baseline"
  | "hrv_not_below_baseline"
  | "sleep_not_below_baseline";

export interface FlaggedNight {
  night: string;
  hrvMs: number;
  /** % difference from the baseline mean (negative = below). */
  hrvPctVsBaseline: number;
  sleepHours: number;
  /** Hours difference from the baseline mean (negative = below). */
  sleepVsBaselineHours: number;
}

export interface Stat {
  mean: number;
  sd: number;
  n: number;
}

export interface HrvSleepDeclineResult {
  ruleId: typeof HRV_SLEEP_DECLINE_ID;
  fired: boolean;
  /** Watch when fired; this rule never escalates on its own. */
  status: "watch" | null;
  reason: DeclineReason;
  basis: "app heuristic";
  config: HrvSleepDeclineConfig;
  citations: Citation[];
  baseline: { start: string; end: string; hrv: Stat; sleep: Stat } | null;
  flagged: FlaggedNight[];
  /** Average sleep over the flagged nights. */
  sleepAvg: number | null;
  sleepAvgVsBaselineHours: number | null;
  /** Which sleep condition was met: below personal baseline, under the floor, or both. */
  sleepCondition: "below_baseline" | "below_floor" | "both" | null;
  /** The last 7 nights, for the charts. */
  recent: NightlyReading[];
}

const DAY_MS = 86_400_000;
const dayNumber = (d: string) =>
  Math.round(Date.parse(`${d}T00:00:00Z`) / DAY_MS);
const round = (v: number, places = 1) =>
  Math.round(v * 10 ** places) / 10 ** places;

function stat(xs: number[]): Stat {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd =
    xs.length > 1
      ? Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (xs.length - 1))
      : 0;
  return { mean, sd, n: xs.length };
}

/**
 * Evaluates the rule for one crew member.
 * @param nights any order; nights without both values are ignored for the flagged window.
 * @param today YYYY-MM-DD (UTC).
 */
export function evaluateHrvSleepDecline(
  nights: readonly NightlyReading[],
  today: string,
  config: HrvSleepDeclineConfig = HRV_SLEEP_DECLINE_CONFIG,
): HrvSleepDeclineResult {
  const sorted = [...nights].sort((a, b) => a.night.localeCompare(b.night));
  const complete = sorted.filter(
    (n) => n.hrvMs !== null && n.sleepHours !== null,
  );
  const base = {
    ruleId: HRV_SLEEP_DECLINE_ID,
    basis: "app heuristic" as const,
    config,
    citations: HRV_SLEEP_DECLINE_CITATIONS,
    recent: sorted.slice(-7),
  };
  const notFired = (
    reason: DeclineReason,
    extra: Partial<HrvSleepDeclineResult> = {},
  ): HrvSleepDeclineResult => ({
    ...base,
    fired: false,
    status: null,
    reason,
    baseline: null,
    flagged: [],
    sleepAvg: null,
    sleepAvgVsBaselineHours: null,
    sleepCondition: null,
    ...extra,
  });

  const window = complete.slice(-config.flaggedNights);
  if (window.length < config.flaggedNights) return notFired("no_data");

  // Recent: alerts only use data from the last couple of nights.
  if (
    dayNumber(today) - dayNumber(window.at(-1)!.night) >
    config.maxNightAgeDays
  )
    return notFired("stale");

  // Consecutive nights only.
  for (let i = 1; i < window.length; i++) {
    if (dayNumber(window[i].night) - dayNumber(window[i - 1].night) !== 1)
      return notFired("not_consecutive");
  }

  // Personal baseline: the nights in the `baselineDays` before the flagged window.
  const firstFlagged = dayNumber(window[0].night);
  const baselineNights = sorted.filter((n) => {
    const d = dayNumber(n.night);
    return d < firstFlagged && d >= firstFlagged - config.baselineDays;
  });
  const hrvVals = baselineNights.flatMap((n) =>
    n.hrvMs === null ? [] : [n.hrvMs],
  );
  const sleepVals = baselineNights.flatMap((n) =>
    n.sleepHours === null ? [] : [n.sleepHours],
  );
  if (
    hrvVals.length < config.minBaselineNights ||
    sleepVals.length < config.minBaselineNights
  ) {
    return notFired("insufficient_baseline");
  }
  const hrv = stat(hrvVals);
  const sleep = stat(sleepVals);
  const baseline = {
    start: baselineNights[0].night,
    end: baselineNights.at(-1)!.night,
    hrv,
    sleep,
  };

  const flagged: FlaggedNight[] = window.map((n) => ({
    night: n.night,
    hrvMs: n.hrvMs!,
    hrvPctVsBaseline: round(((n.hrvMs! - hrv.mean) / hrv.mean) * 100),
    sleepHours: n.sleepHours!,
    sleepVsBaselineHours: round(n.sleepHours! - sleep.mean, 2),
  }));
  const sleepAvg =
    window.reduce((a, n) => a + n.sleepHours!, 0) / window.length;
  const belowBaseline = sleepAvg <= sleep.mean - config.sleepDropHours;
  const belowFloor = sleepAvg < config.sleepFloorHours;
  const details = {
    baseline,
    flagged,
    sleepAvg: round(sleepAvg, 2),
    sleepAvgVsBaselineHours: round(sleepAvg - sleep.mean, 2),
    sleepCondition:
      belowBaseline && belowFloor
        ? "both"
        : belowBaseline
          ? "below_baseline"
          : belowFloor
            ? "below_floor"
            : null,
  } as const;

  const hrvLow = window.every(
    (n) => n.hrvMs! <= hrv.mean * (1 - config.hrvDropPct / 100),
  );
  if (!hrvLow) return notFired("hrv_not_below_baseline", details);
  if (!belowBaseline && !belowFloor)
    return notFired("sleep_not_below_baseline", details);

  return { ...base, ...details, fired: true, status: "watch", reason: "fired" };
}
