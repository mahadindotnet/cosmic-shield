import "server-only";
import { tool } from "ai";
import { z } from "zod";
import {
  BASELINE_INDICATORS,
  getActiveAlerts,
  getEnvironment,
  getGuidance,
  getLatestVitals,
  getRadiationStatus,
  getReferenceBaseline,
  getSleepHistory,
  getSpaceWeather,
  GUIDANCE_IDS,
  type CopilotContext,
} from "./copilot-data";

export { TOOL_LABELS } from "./tool-labels";

/**
 * The co-pilot's tools, bound to one user context. Read-only. None takes a
 * crew ID: they always read `ctx.subject` (the signed-in crew member, or the
 * crew member a flight surgeon selected), so the model can't reach anyone
 * else's data. Every result is `{ data, source }`.
 */
export function buildCopilotTools(ctx: CopilotContext) {
  return {
    get_latest_vitals: tool({
      description: "The crew member's latest vitals (heart rate, blood pressure, SpO2, glucose) with each measure's rule status and reason.",
      inputSchema: z.object({}),
      execute: async () => getLatestVitals(ctx),
    }),
    get_sleep_history: tool({
      description: "The crew member's logged nights: sleep hours, HRV (RMSSD, ms), stress 1-5, averages and the latest night's status.",
      inputSchema: z.object({ days: z.number().int().min(1).max(30).default(7).describe("How many recent nights, 1-30") }),
      execute: async ({ days }) => getSleepHistory(ctx, days),
    }),
    get_radiation_status: tool({
      description: "Career dose total (sum of dose entries) against the 600 mSv NASA-STD-3001 limit, % of the limit, latest dosimeter reading and the projected dose for a full mission in the chosen environment.",
      inputSchema: z.object({}),
      execute: async () => getRadiationStatus(ctx),
    }),
    get_space_weather: tool({
      description: "Recent solar activity from NASA DONKI (flares, CMEs, solar particle events, geomagnetic storms), live or cached.",
      inputSchema: z.object({}),
      execute: async () => getSpaceWeather(),
    }),
    get_environment: tool({
      description: "The chosen mission environment: comms delay to the ground, gravity, typical daily dose, mission length and shelter procedure. Says when none is chosen.",
      inputSchema: z.object({}),
      execute: async () => getEnvironment(ctx),
    }),
    get_active_alerts: tool({
      description: "Every active Watch or Escalate from the deterministic rules engine (vitals, sleep, dose, career dose, and the hrv_sleep_decline early warning with its per-night numbers), plus open escalation records.",
      inputSchema: z.object({}),
      execute: async () => getActiveAlerts(ctx),
    }),
    get_reference_baseline: tool({
      description: "Inspiration4 pre-flight reference range for a metabolic indicator (NASA OSDR OSD-575, n=4 crew). Context only; it never sets a status.",
      inputSchema: z.object({ indicator: z.enum(BASELINE_INDICATORS) }),
      execute: async ({ indicator }) => getReferenceBaseline(indicator),
    }),
    get_guidance: tool({
      description: "Non-diagnostic onboard guidance for a rule, with when to contact the flight surgeon and the comms delay.",
      inputSchema: z.object({ ruleId: z.enum(GUIDANCE_IDS) }),
      execute: async ({ ruleId }) => getGuidance(ctx, ruleId),
    }),
  };
}

export type CopilotTools = ReturnType<typeof buildCopilotTools>;
