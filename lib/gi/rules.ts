import thresholds from "@/data/rules/thresholds.json";
import { addDays } from "@/lib/vitals/summary";

/**
 * GI rules (pure). The seven stool types follow the Bristol Stool Form Scale
 * (Lewis SJ, Heaton KW, Scand J Gastroenterol 1997;32(9):920–924). The two
 * pattern rules and the 2–3 L daily fluid band are app defaults
 * (thresholds.json `gi`, docs/rules.md). Watch only; never a diagnosis.
 *
 * - `gi_hard`: types 1–2 on 2 or more of the last 3 UTC days (ending today).
 * - `gi_loose`: types 6–7 on 2 or more of the last 3 UTC days.
 */

export const GI_HARD_ID = "gi_hard" as const;
export const GI_LOOSE_ID = "gi_loose" as const;
export type GiRuleId = typeof GI_HARD_ID | typeof GI_LOOSE_ID;
export type GiStatus = "normal" | "watch" | "no-data";

const g = thresholds.gi;
export const GI_LIMITS = {
  hardTypes: g.hardTypes as readonly number[],
  looseTypes: g.looseTypes as readonly number[],
  windowDays: g.windowDays,
  minDays: g.minDays,
  fluidMinL: g.fluidMinL,
  fluidMaxL: g.fluidMaxL,
} as const;

/** Bristol Stool Form Scale, Lewis & Heaton 1997: the standard description of each type. */
export const BRISTOL_TYPES = [
  { type: 1, description: "Separate hard lumps, like nuts (hard to pass)" },
  { type: 2, description: "Sausage-shaped but lumpy" },
  { type: 3, description: "Like a sausage but with cracks on its surface" },
  { type: 4, description: "Like a sausage or snake, smooth and soft" },
  { type: 5, description: "Soft blobs with clear-cut edges (passed easily)" },
  { type: 6, description: "Fluffy pieces with ragged edges, a mushy stool" },
  { type: 7, description: "Watery, no solid pieces, entirely liquid" },
] as const;

export const bristolDescription = (type: number) => BRISTOL_TYPES.find((b) => b.type === type)?.description ?? "";

export const GI_MESSAGES: Record<GiRuleId, { title: string; advice: string }> = {
  gi_hard: {
    title: "Possible dehydration / constipation pattern",
    advice: "Increase fluids and fibre.",
  },
  gi_loose: {
    title: "Loose stools",
    advice: "Hydrate, and contact the CMO if it continues.",
  },
};

/** The Bristol types logged on one UTC day, and the fluid logged that day. */
export interface GiDay {
  day: string;
  types: number[];
  fluidL: number;
}

export interface GiPatternResult {
  ruleId: GiRuleId;
  status: Exclude<GiStatus, "no-data">;
  /** Days in the window with a matching type, oldest first. */
  days: string[];
  reason?: string;
}

export interface GiEvaluation {
  status: GiStatus;
  hard: GiPatternResult;
  loose: GiPatternResult;
  /** Days in the window with any entry. */
  daysLogged: number;
}

function pattern(ruleId: GiRuleId, inWindow: readonly GiDay[], types: readonly number[]): GiPatternResult {
  const days = inWindow.filter((d) => d.types.some((t) => types.includes(t))).map((d) => d.day);
  if (days.length < GI_LIMITS.minDays) return { ruleId, status: "normal", days };
  const m = GI_MESSAGES[ruleId];
  const range = `${types[0]}–${types.at(-1)}`;
  return {
    ruleId,
    status: "watch",
    days,
    reason: `${m.title}: types ${range} on ${days.length} of the last ${GI_LIMITS.windowDays} days. ${m.advice}`,
  };
}

export function evaluateGi(days: readonly GiDay[], today: string): GiEvaluation {
  const start = addDays(today, -(GI_LIMITS.windowDays - 1));
  const inWindow = days.filter((d) => d.day >= start && d.day <= today && d.types.length > 0).sort((a, b) => a.day.localeCompare(b.day));
  const hard = pattern(GI_HARD_ID, inWindow, GI_LIMITS.hardTypes);
  const loose = pattern(GI_LOOSE_ID, inWindow, GI_LIMITS.looseTypes);
  const status: GiStatus = !inWindow.length ? "no-data" : hard.status === "watch" || loose.status === "watch" ? "watch" : "normal";
  return { status, hard, loose, daysLogged: inWindow.length };
}

/** Fluid intake against the 2–3 L daily band (app default): display only, never a status. */
export function fluidBand(litres: number) {
  if (litres < GI_LIMITS.fluidMinL) return "below" as const;
  if (litres > GI_LIMITS.fluidMaxL) return "above" as const;
  return "within" as const;
}
