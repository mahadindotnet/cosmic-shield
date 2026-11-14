import "server-only";
import { activeAlertsFor, type ActiveAlert } from "@/lib/alerts/active";
import thresholds from "@/data/rules/thresholds.json";
import type { UserRow } from "@/lib/auth/users";
import { getMissionEnvironment, type MissionEnvironment, type MissionEnvironmentId } from "@/lib/mission/environments";
import { getBaselines } from "@/lib/nasa/loaders";
import { radiationSummaryFor } from "@/lib/radiation/data";
import { RADIATION_LIMITS } from "@/lib/radiation/rules";
import { loadSpaceWeather } from "@/lib/radiation/space-weather";
import { projectedMissionMsv } from "@/lib/radiation/summary";
import { HRV_SLEEP_DECLINE_FOLLOW_UP, HRV_SLEEP_DECLINE_MAY_MEAN, HRV_SLEEP_DECLINE_STEPS } from "@/lib/rules/hrv-guidance";
import { HRV_SLEEP_DECLINE_CITATIONS, HRV_SLEEP_DECLINE_ID } from "@/lib/rules/hrv-sleep-decline";
import { sleepSummaryFor } from "@/lib/sleep/data";
import { CMO_LINE } from "./safety";
import { ESCALATE_GUIDANCE } from "@/lib/vitals/escalation";
import { vitalsSummaryFor } from "@/lib/vitals/data";
import { sourceText } from "@/lib/vitals/rules";

/**
 * Read-only data for the AI co-pilot's tools. Every function reads only the
 * crew member in `ctx.subject` (the signed-in crew member, or the crew member
 * a flight surgeon selected); no tool takes a crew ID from the model. Every
 * result carries its source and citation.
 */

export interface CopilotContext {
  /** The signed-in user. */
  viewer: UserRow;
  /** Whose data the tools read: the crew member themself, or the crew member a flight surgeon selected (null if none). */
  subject: UserRow | null;
}

export interface Source {
  /** Short label for the tool chip, e.g. "NASA RadLab". */
  label: string;
  /** Full citation the answer can quote. */
  citation: string;
  url?: string;
}

export interface ToolResult<T> {
  data: T;
  source: Source;
}

const RULES_DOC = "Cosmic Shield rules engine (docs/rules.md, data/rules/thresholds.json)";
const NO_SUBJECT = {
  available: false as const,
  message: "No crew member selected. A flight surgeon picks one on the Crew admin page.",
};

const subjectEnvironment = (ctx: CopilotContext): MissionEnvironment | null =>
  getMissionEnvironment(((ctx.subject ?? ctx.viewer).environment as MissionEnvironmentId | null) ?? null);

/** The comms delay sentence used whenever the answer advises contacting the ground. */
export function contactLine(env: MissionEnvironment | null) {
  return env
    ? `contact the flight surgeon (one-way comms delay on ${env.name}: ${env.commsDelayLabel})`
    : "contact the flight surgeon (no mission environment is chosen, so the comms delay is unknown; pick one in the top bar)";
}

/* --------------------------------------------------------------- tools */

export function getEnvironment(ctx: CopilotContext) {
  const env = subjectEnvironment(ctx);
  if (!env)
    return {
      data: { chosen: false as const, message: "No mission environment is chosen. Pick ISS, Lunar surface, Mars transit or Mars surface in the top bar." },
      source: { label: "Account settings", citation: "No environment saved on the account." },
    };
  return {
    data: {
      chosen: true as const,
      id: env.id,
      name: env.name,
      commsDelayOneWay: env.commsDelayLabel,
      commsRoundTrip: env.commsRoundTripLabel,
      commsDelayMaxMinutes: env.commsDelayMaxMinutes,
      groundSupport: env.groundSupport,
      gravity: env.gravityLabel,
      typicalDoseMsvPerDay: env.radiationMsvPerDay,
      doseWatchMsvPerDay: env.radiationWatchMsvPerDay,
      missionLength: env.missionDaysLabel,
      missionDays: env.missionDays,
      shelterProcedure: env.shelter,
    },
    source: { label: "Mission environment", citation: `${env.sources}; dose: ${env.radiation.sourceLabel}` },
  };
}

export function getLatestVitals(ctx: CopilotContext) {
  if (!ctx.subject) return { data: NO_SUBJECT, source: { label: "Vitals log", citation: RULES_DOC } };
  const s = vitalsSummaryFor(ctx.subject.id);
  const latest = s.latest;
  const cited = new Set(latest?.evaluation.checks.flatMap((c) => c.triggered.map((t) => t.source)).filter(Boolean) as string[]);
  return {
    data: latest
      ? {
          available: true as const,
          takenAtUtc: latest.recordedAt,
          status: latest.evaluation.status,
          measures: latest.evaluation.checks.map((c) => ({ measure: c.label, value: c.display, unit: c.unit, status: c.status, reason: c.reason ?? null })),
          readingsInHistory: s.history.length,
        }
      : { available: false as const, message: "No vitals logged yet." },
    source: {
      label: "Vitals log",
      citation: [RULES_DOC + ". Watch levels are app defaults.", ...[...cited].map((k) => sourceText(k)!)].join(" | "),
    },
  };
}

export function getSleepHistory(ctx: CopilotContext, days: number) {
  if (!ctx.subject) return { data: NO_SUBJECT, source: { label: "Sleep log", citation: RULES_DOC } };
  const n = Math.max(1, Math.min(30, Math.round(days)));
  const s = sleepSummaryFor(ctx.subject.id, Math.max(14, n));
  const nights = s.trends.sleepHours
    .map((p, i) => ({ night: p.day, sleepHours: p.value, hrvRmssdMs: s.trends.hrvRmssd[i]?.value ?? null, stress1to5: s.trends.stress[i]?.value ?? null }))
    .filter((x) => x.sleepHours !== null)
    .slice(-n);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  return {
    data: {
      available: true as const,
      nightsRequested: n,
      nights,
      averageSleepHours: avg(nights.map((x) => x.sleepHours!)),
      averageHrvMs: avg(nights.flatMap((x) => (x.hrvRmssdMs === null ? [] : [x.hrvRmssdMs]))),
      personal14NightHrvMeanMs: s.hrvBand?.mean ?? null,
      baselineWindowNights: Math.max(14, n),
      lastNight: s.latest ? { night: s.latest.night, status: s.latest.evaluation.status, reasons: s.latest.evaluation.reasons } : null,
      sleepWatchLevelHours: thresholds.vitals.sleepHours.watchLow,
    },
    source: { label: "Sleep log", citation: `${RULES_DOC}. Per-night Watch levels are app defaults.` },
  };
}

export function getRadiationStatus(ctx: CopilotContext) {
  const env = subjectEnvironment(ctx);
  const careerCitation = sourceText(RADIATION_LIMITS.careerLimitSource)!;
  if (!ctx.subject) return { data: NO_SUBJECT, source: { label: "Dose log", citation: careerCitation } };
  const s = radiationSummaryFor(ctx.subject.id);
  const mission = env ? projectedMissionMsv(env.radiationMsvPerDay, env.missionDays) : null;
  return {
    data: {
      available: true as const,
      careerTotalMsv: s.career.totalMsv,
      careerLimitMsv: RADIATION_LIMITS.careerLimit,
      careerPctOfLimit: s.career.pctOfLimit,
      careerStatus: s.career.status,
      careerWatchMsv: RADIATION_LIMITS.careerWatch,
      latest: s.latest
        ? {
            takenAtUtc: s.latest.recordedAt,
            doseMsv: s.latest.doseMsv,
            periodHours: s.latest.periodHours,
            rateMsvPerDay: s.latest.evaluation.rate,
            watchLevelMsvPerDay: s.latest.evaluation.watchLevel,
            status: s.latest.evaluation.status,
          }
        : null,
      environment: env ? { name: env.name, typicalDoseMsvPerDay: env.radiationMsvPerDay, doseBasis: env.radiation.basis, missionDays: env.missionDays } : null,
      projection: env && mission !== null ? { fullMissionMsv: mission, careerAfterMissionMsv: Math.round(s.career.totalMsv + mission) } : null,
      projectionNote: env ? null : "No mission environment chosen, so there is no projection. Pick one in the top bar.",
    },
    source: {
      label: env ? (env.radiation.basis === "measured" ? "NASA RadLab" : env.radiation.sourceLabel) : "Dose log",
      citation: `${careerCitation}${env ? ` | Daily dose on ${env.name}: ${env.radiation.sourceLabel}` : ""}`,
    },
  };
}

export async function getSpaceWeather() {
  const sw = await loadSpaceWeather(5);
  return {
    data: {
      origin: sw.origin,
      fetchedAt: sw.fetchedAt,
      window: sw.startDate && sw.endDate ? `${sw.startDate} to ${sw.endDate}` : null,
      feeds: sw.feeds,
      latestEvents: sw.events.map((e) => ({ type: e.type, startUtc: e.start_time, detail: e.class_or_intensity })),
      note: "Space weather is context only and never changes a dose status.",
    },
    source: {
      label: sw.origin === "live" ? "NASA DONKI (live)" : "NASA DONKI (cached)",
      citation: "NASA DONKI, Space Weather Database Of Notifications, Knowledge, Information (https://kauai.ccmc.gsfc.nasa.gov/DONKI/)",
      url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
    },
  };
}

export type { ActiveAlert } from "@/lib/alerts/active";

export function getActiveAlerts(ctx: CopilotContext) {
  if (!ctx.subject) return { data: { ...NO_SUBJECT, alerts: [] as ActiveAlert[] }, source: { label: "Rules engine", citation: RULES_DOC } };
  const { alerts, hrv, hrvDismissedToday, openEscalations } = activeAlertsFor(ctx.subject.id);
  let hrvDetail = null;
  if (hrv.fired && hrv.baseline) {
    const avgPct = Math.round((hrv.flagged.reduce((a, f) => a + f.hrvPctVsBaseline, 0) / hrv.flagged.length) * 10) / 10;
    hrvDetail = {
      flaggedNights: hrv.flagged.map((f) => ({ night: f.night, hrvMs: f.hrvMs, hrvPctVsBaseline: f.hrvPctVsBaseline, sleepHours: f.sleepHours })),
      averageHrvPctVsBaseline: avgPct,
      averageHrvDropPct: Math.abs(avgPct),
      baselineHrvMeanMs: Math.round(hrv.baseline.hrv.mean * 10) / 10,
      baselineSleepMeanHours: Math.round(hrv.baseline.sleep.mean * 100) / 100,
      flaggedSleepAverageHours: hrv.sleepAvg,
      hrvDropThresholdPct: hrv.config.hrvDropPct,
      baselineNights: hrv.baseline.hrv.n,
      dismissedToday: hrvDismissedToday,
    };
  }
  const hrpCitation = HRV_SLEEP_DECLINE_CITATIONS[0];
  return {
    data: {
      available: true as const,
      alertCount: alerts.length,
      alerts: alerts.map(({ ruleId, level, title, detail }) => ({ ruleId, level, title, detail })),
      hrvSleepDecline: hrvDetail,
      openEscalationRecords: openEscalations,
      note: "Statuses come from the deterministic rules engine. Decision support, not a diagnosis.",
    },
    source: {
      label: "Rules engine",
      citation: hrv.fired ? `${RULES_DOC} | ${hrpCitation.source}: "${hrpCitation.title}" (${hrpCitation.url}). ${hrpCitation.note}` : RULES_DOC,
      url: hrv.fired ? hrpCitation.url : undefined,
    },
  };
}

export const BASELINE_INDICATORS = ["glucose", "calcium", "sodium", "potassium", "bun", "creatinine"] as const;
export type BaselineIndicator = (typeof BASELINE_INDICATORS)[number];
const ANALYTE: Record<BaselineIndicator, string> = {
  glucose: "Glucose",
  calcium: "Calcium",
  sodium: "Sodium",
  potassium: "Potassium",
  bun: "BUN (urea nitrogen)",
  creatinine: "Creatinine",
};

export function getReferenceBaseline(indicator: BaselineIndicator) {
  const { data, origin } = getBaselines();
  const a = data.pooled.preflight_baseline.find((x) => x.analyte === ANALYTE[indicator]);
  return {
    data: a
      ? {
          available: true as const,
          indicator,
          analyte: a.analyte,
          unit: a.unit,
          label: `Inspiration4 crew reference (n=${data.crew.length})`,
          preflightMin: a.min,
          preflightMax: a.max,
          preflightMedian: a.median,
          samples: a.n,
          crewCount: data.crew.length,
          timepoints: a.timepoints,
          labRange: "lab_range_min" in a ? { min: a.lab_range_min, max: a.lab_range_max } : null,
          note: `${data.note}. ${"analyte_note" in a && a.analyte_note ? a.analyte_note : ""} Reference for context only; it does not set any status.`.trim(),
          origin,
        }
      : { available: false as const, message: `No OSD-575 baseline for ${indicator}.` },
    source: { label: "NASA OSDR OSD-575", citation: `${data.source}: ${data.dataset}`, url: data.url },
  };
}

export const GUIDANCE_IDS = [
  HRV_SLEEP_DECLINE_ID,
  "vitals_blood_pressure",
  "vitals_spo2",
  "vitals_glucose",
  "vitals",
  "sleep_night",
  "radiation_daily",
  "radiation_career",
  "space_weather",
  "mind_pattern",
  "mind_safety",
  "bone_exercise",
  "gi_hard",
  "gi_loose",
  "eye_amsler",
] as const;
export type GuidanceId = (typeof GUIDANCE_IDS)[number];

export function getGuidance(ctx: CopilotContext, ruleId: GuidanceId) {
  const env = subjectEnvironment(ctx);
  const contact = contactLine(env);
  const v = thresholds.vitals;
  const table: Record<GuidanceId, { steps: string[]; whenToContact: string; citation: string; label: string; url?: string }> = {
    hrv_sleep_decline: {
      steps: [...HRV_SLEEP_DECLINE_STEPS, ...HRV_SLEEP_DECLINE_FOLLOW_UP],
      whenToContact: `If it continues or you feel unwell, talk to your Crew Medical Officer, or ${contact}.`,
      citation: `${HRV_SLEEP_DECLINE_CITATIONS[0].source}: "${HRV_SLEEP_DECLINE_CITATIONS[0].title}" (${HRV_SLEEP_DECLINE_CITATIONS[0].url}). What the pattern may mean: ${HRV_SLEEP_DECLINE_MAY_MEAN.join(" ")}`,
      label: "NASA HRP",
      url: HRV_SLEEP_DECLINE_CITATIONS[0].url,
    },
    vitals_blood_pressure: { steps: [ESCALATE_GUIDANCE.bloodPressure], whenToContact: `If it is still above 180/120 after re-measuring, ${contact}.`, citation: sourceText(v.bloodPressureEscalate.source)!, label: "AHA" },
    vitals_spo2: { steps: [ESCALATE_GUIDANCE.spo2], whenToContact: `Below 90 %: ${contact} now.`, citation: sourceText(v.spo2Pct.escalateSource)!, label: "WHO" },
    vitals_glucose: { steps: [ESCALATE_GUIDANCE.glucose], whenToContact: `Below 54 mg/dL: ${contact} now.`, citation: sourceText(v.glucoseMgDl.escalateSource)!, label: "ADA" },
    vitals: {
      steps: ["Rest seated for five minutes and take the flagged measure again.", "If it stays in Watch, follow onboard guidance and log it."],
      whenToContact: `If a reading reaches Escalate, ${contact}.`,
      citation: `${RULES_DOC}. Watch levels are app defaults.`,
      label: "Rules engine",
    },
    sleep_night: {
      steps: ["Protect your next sleep period.", "Log tonight's sleep too, so the trend is complete."],
      whenToContact: `If short sleep continues for several nights, talk to your Crew Medical Officer, or ${contact}.`,
      citation: `${RULES_DOC}. Per-night Watch levels are app defaults.`,
      label: "Rules engine",
    },
    radiation_daily: {
      steps: ["Check the dosimeter reading and the period it covers.", "Check NASA DONKI for a solar particle event."],
      whenToContact: `If readings stay high, ${contact}.`,
      citation: `${RULES_DOC}. Daily Watch level = 2 × the environment's typical dose (app default).`,
      label: "Rules engine",
    },
    radiation_career: {
      steps: ["Keep logging every dosimeter reading.", "Review planned activities with the flight surgeon."],
      whenToContact: `Above the 600 mSv career limit: ${contact}.`,
      citation: sourceText(RADIATION_LIMITS.careerLimitSource)!,
      label: "NASA-STD-3001",
    },
    mind_pattern: {
      steps: [
        "Protect your next sleep period.",
        "Try a few minutes of slow breathing when things feel heavy.",
        "Talk to a crewmate you trust, or plan a call home.",
        "Ask for a workload adjustment if the schedule feels like too much.",
      ],
      whenToContact: `If it doesn't ease in a few days, talk to your Crew Medical Officer, or ${contact}. ${CMO_LINE}`,
      citation: `${RULES_DOC}. Mind check-in pattern (app default, Watch only; not a screening tool).`,
      label: "Rules engine",
    },
    bone_exercise: {
      steps: [
        "Fit in short exercise sessions: aerobic and resistance both count toward the daily target.",
        "Log each session on the Bone protection page so the weekly total is complete.",
      ],
      whenToContact: `If you can't keep up the schedule, ask for a workload adjustment, or ${contact}.`,
      citation: `${RULES_DOC}. Exercise target is the mission environment's (ISS 120 min/day: NASA, about two hours a day; other environments: app default).`,
      label: "Rules engine",
    },
    gi_hard: {
      steps: ["Increase fluids through the day, toward the 2–3 L daily band.", "Add fibre-rich foods from the menu where you can.", "Keep logging each entry on the GI page."],
      whenToContact: `If it continues or you feel unwell, talk to your Crew Medical Officer, or ${contact}.`,
      citation: `${RULES_DOC}. Bristol types per Lewis & Heaton 1997; the 3-day pattern rule and the fluid band are app defaults (Watch only).`,
      label: "Rules engine",
    },
    eye_amsler: {
      steps: ["Repeat the Amsler test for that eye tomorrow, in good light, at about 35 cm.", "Tell your Crew Medical Officer what you noticed.", "Log a fundus photo if one is due, and flag it for ground review if you want a person to look."],
      whenToContact: `Tell your Crew Medical Officer now. If changes show on 2 tests in a row, the flight surgeon is told automatically; you can also reach them: ${contact}.`,
      citation: `${RULES_DOC}. Amsler rule is an app default (Watch only, not a diagnosis). Why eyes are monitored: NASA HRP, Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS).`,
      label: "Rules engine",
      url: "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105",
    },
    gi_loose: {
      steps: ["Hydrate: sip fluids steadily through the day.", "Keep logging each entry on the GI page."],
      whenToContact: `If it continues, contact your Crew Medical Officer, or ${contact}.`,
      citation: `${RULES_DOC}. Bristol types per Lewis & Heaton 1997; the 3-day pattern rule is an app default (Watch only).`,
      label: "Rules engine",
    },
    mind_safety: {
      steps: ["Talk to your Crew Medical Officer right away.", "You don't have to handle this alone; the flight surgeon has been told."],
      whenToContact: `Now: your Crew Medical Officer, then ${contact} or ground behavioural health support.`,
      citation: "Cosmic Shield safety check (lib/ai/safety.ts): simple phrase matching, not a clinical tool.",
      label: "Safety check",
    },
    space_weather: {
      steps: [env ? env.shelter : "Follow the shelter procedure for your mission environment (choose one in the top bar)."],
      whenToContact: `During a solar particle event, ${contact}.`,
      citation: "NASA DONKI (https://kauai.ccmc.gsfc.nasa.gov/DONKI/); shelter procedure from the mission environment.",
      label: "Mission environment",
    },
  };
  const g = table[ruleId];
  return {
    data: { ruleId, steps: g.steps, whenToContact: g.whenToContact, environment: env?.name ?? null, commsDelayOneWay: env?.commsDelayLabel ?? null },
    source: { label: g.label, citation: g.citation, url: g.url },
  };
}
