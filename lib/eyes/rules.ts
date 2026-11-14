import thresholds from "@/data/rules/thresholds.json";

/**
 * Eye screening rules (pure). Why eyes are monitored in flight: NASA HRP,
 * "Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)"
 * (thresholds.json source `nasa-hrr-sans`). The rules themselves are app
 * defaults, Watch only, and never a diagnosis:
 *
 * - `eye_amsler`: the latest Amsler test of either eye had a marked cell, or
 *   the centre dot was not seen → Watch, "Vision change noticed: repeat the
 *   test tomorrow and tell your CMO."
 * - `eye_amsler_repeat`: changes on 2 Amsler tests in a row of the same eye →
 *   also an escalation record for the flight surgeon (created once, when the
 *   run of changed tests reaches 2).
 * - `eye_ground_review`: the crew member ticked "Flag for ground review" on a
 *   fundus photo → an escalation record for the flight surgeon (Watch level).
 */

export const EYE_AMSLER_ID = "eye_amsler" as const;
export const EYE_AMSLER_REPEAT_ID = "eye_amsler_repeat" as const;
export const EYE_GROUND_REVIEW_ID = "eye_ground_review" as const;

export const EYES = ["left", "right"] as const;
export type EyeSide = (typeof EYES)[number];
export type EyeStatus = "normal" | "watch" | "no-data";

const e = thresholds.eyes;
export const EYE_LIMITS = {
  gridSize: e.gridSize,
  repeatTestsForSurgeon: e.repeatTestsForSurgeon,
  amslerCadence: e.amslerCadence,
} as const;

export const SANS_RISK = {
  title: "Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)",
  url: "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105",
  quote: "70% of crewmembers experience one or more of the hallmark signs of SANS",
} as const;

export const VISION_CHANGE_MESSAGE = "Vision change noticed: repeat the test tomorrow and tell your CMO.";

export type Cell = readonly [row: number, col: number];

export interface AmslerTest {
  id: number;
  /** ISO UTC. */
  recordedAt: string;
  eye: EyeSide;
  marks: readonly Cell[];
  centreVisible: boolean;
}

/** A change was noticed: any marked cell, or the centre dot not seen. */
export const amslerChanged = (t: Pick<AmslerTest, "marks" | "centreVisible">) => t.marks.length > 0 || !t.centreVisible;

/** "3 cells marked; centre dot not seen", or "No change noticed". */
export function describeAmsler(t: Pick<AmslerTest, "marks" | "centreVisible">) {
  const parts: string[] = [];
  if (t.marks.length) parts.push(`${t.marks.length} ${t.marks.length === 1 ? "cell" : "cells"} marked`);
  if (!t.centreVisible) parts.push("centre dot not seen");
  return parts.length ? parts.join("; ") : "No change noticed";
}

export interface AmslerEvaluation {
  status: EyeStatus;
  /** Latest test per eye (null if that eye was never tested). */
  latest: Record<EyeSide, AmslerTest | null>;
  /** Eyes whose latest test showed a change. */
  changedEyes: EyeSide[];
  /** Eyes whose last `repeatTestsForSurgeon` tests all showed a change. */
  repeatEyes: EyeSide[];
  reason?: string;
}

const byTime = (a: AmslerTest, b: AmslerTest) => a.recordedAt.localeCompare(b.recordedAt) || a.id - b.id;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Changed tests in a row at the end of one eye's history (oldest → newest). */
export function changedRun(testsOfOneEye: readonly AmslerTest[]) {
  const sorted = [...testsOfOneEye].sort(byTime);
  let run = 0;
  for (let i = sorted.length - 1; i >= 0 && amslerChanged(sorted[i]); i--) run++;
  return run;
}

export function evaluateAmsler(tests: readonly AmslerTest[]): AmslerEvaluation {
  const latest = { left: null, right: null } as Record<EyeSide, AmslerTest | null>;
  const changedEyes: EyeSide[] = [];
  const repeatEyes: EyeSide[] = [];
  for (const eye of EYES) {
    const mine = tests.filter((t) => t.eye === eye).sort(byTime);
    latest[eye] = mine.at(-1) ?? null;
    if (latest[eye] && amslerChanged(latest[eye])) changedEyes.push(eye);
    if (changedRun(mine) >= EYE_LIMITS.repeatTestsForSurgeon) repeatEyes.push(eye);
  }
  if (!latest.left && !latest.right) return { status: "no-data", latest, changedEyes, repeatEyes };
  if (!changedEyes.length) return { status: "normal", latest, changedEyes, repeatEyes };
  const detail = changedEyes.map((eye) => `${cap(eye)} eye: ${describeAmsler(latest[eye]!)}.`).join(" ");
  const repeat = repeatEyes.length ? ` Changes on ${EYE_LIMITS.repeatTestsForSurgeon} tests in a row: the flight surgeon has been told.` : "";
  return { status: "watch", latest, changedEyes, repeatEyes, reason: `${VISION_CHANGE_MESSAGE} ${detail}${repeat}` };
}

/** Parses stored marks (JSON [[row, col], …]); anything malformed is dropped. */
export function parseMarks(json: string | null): Cell[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v.filter(isCell).map(([r, c]) => [r, c] as const);
  } catch {
    return [];
  }
}

export function isCell(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((n) => Number.isInteger(n) && n >= 0 && n < EYE_LIMITS.gridSize)
  );
}
