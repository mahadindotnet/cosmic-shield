import type {
  BaselineIndicator,
  getActiveAlerts,
  getEnvironment,
  getGuidance,
  getLatestVitals,
  getRadiationStatus,
  getReferenceBaseline,
  getSleepHistory,
  getSpaceWeather,
  GuidanceId,
} from "./copilot-data";

/**
 * Offline (mock) co-pilot logic: deterministic intent matching, a plan of real
 * tool calls per step, and answer templates filled only from tool results.
 * Pure: the mock model (mock-model.ts) feeds it the tool results the AI SDK
 * loop produced.
 */

export type Intent = "why_warning" | "what_to_do" | "radiation" | "sleep" | "space_weather" | "baseline" | "vitals" | "environment" | "help";

const RULES: [Intent, RegExp][] = [
  ["why_warning", /\bwhy\b.*\b(watch|warning|escalat\w*|alert|flag\w*|amber|red)\b|seeing this|\bam i on (watch|escalate)\b|what('?s| is) (wrong|going on)|\bmy (status|alerts?)\b|\bactive alerts?\b/i],
  ["what_to_do", /what (should|can|do) i do|what now|next steps?|\badvice\b|\brecommend\w*|\bhelp me (feel|recover)/i],
  ["baseline", /\bbaselines?\b|reference (range|band|value)|normal range|inspiration ?4|osd-?575|\bpre-?flight\b/i],
  ["space_weather", /space weather|\bsolar\b|\bflares?\b|\bcmes?\b|coronal|geomagnetic|\bstorms?\b|\bsun\b|\bdonki\b|particle event/i],
  ["radiation", /radiation|\bdose\b|dosimeter|sievert|\bm?sv\b|career (dose|limit|total)|exposure/i],
  ["sleep", /\bsleep\w*|\bslept\b|\bhrv\b|rmssd|\btired\b|\bfatigue\b|\brest(ed)?\b|\bnights?\b|\bstress(ed)?\b/i],
  ["vitals", /\bvitals?\b|heart rate|\bpulse\b|blood pressure|\bbp\b|spo2|spo₂|oxygen|saturation|glucose|blood sugar/i],
  ["environment", /\benvironment\b|\bmission\b|comms?|delay|latency|where am i|gravity/i],
];

export function matchIntent(question: string): Intent {
  for (const [intent, re] of RULES) if (re.test(question)) return intent;
  return "help";
}

const INDICATOR_WORDS: [BaselineIndicator, RegExp][] = [
  ["calcium", /calcium/i],
  ["sodium", /sodium|\bna\b/i],
  ["potassium", /potassium/i],
  ["bun", /\bbun\b|urea/i],
  ["creatinine", /creatinine|kidney/i],
  ["glucose", /glucose|sugar/i],
];
export const indicatorFrom = (q: string): BaselineIndicator => INDICATOR_WORDS.find(([, re]) => re.test(q))?.[0] ?? "glucose";

/* ------------------------------------------------------------- planning */

export interface ToolCallPlan {
  toolName: string;
  input: Record<string, unknown>;
}

/** Tool results gathered so far this turn, by tool name (several calls of one tool keep their order). */
export type TurnResults = Record<string, { data: unknown; source: { label: string; citation: string; url?: string } }[]>;

type Data<F extends (...a: never[]) => unknown> = Awaited<ReturnType<F>> extends { data: infer D } ? D : never;
type Alerts = Data<typeof getActiveAlerts>;
type Env = Data<typeof getEnvironment>;
type Guidance = Data<typeof getGuidance>;

const first = <T>(r: TurnResults, name: string) => r[name]?.[0] as { data: T; source: { label: string; citation: string; url?: string } } | undefined;

/** Which guidance entry fits an alert. */
export function guidanceFor(alert: { ruleId: string; level: string; detail: string }): GuidanceId {
  if (alert.ruleId === "vitals") {
    if (alert.level === "escalate" && /SpO₂/.test(alert.detail) && /Escalate/.test(alert.detail)) return "vitals_spo2";
    if (alert.level === "escalate" && /Glucose/.test(alert.detail) && /Escalate/.test(alert.detail)) return "vitals_glucose";
    if (alert.level === "escalate" && /(Systolic|Diastolic)[^.]*Escalate/.test(alert.detail)) return "vitals_blood_pressure";
    return "vitals";
  }
  if (["hrv_sleep_decline", "sleep_night", "radiation_daily", "radiation_career", "mind_pattern", "mind_safety", "bone_exercise"].includes(alert.ruleId))
    return alert.ruleId as GuidanceId;
  return "vitals";
}

/**
 * The next tool calls for this turn, or null when every tool the answer needs
 * has been called (then `answer` writes the reply). At most two tool steps.
 */
export function nextToolCalls(intent: Intent, question: string, r: TurnResults): ToolCallPlan[] | null {
  const has = (n: string) => Boolean(r[n]?.length);
  switch (intent) {
    case "why_warning":
    case "what_to_do": {
      if (!has("get_active_alerts")) return [{ toolName: "get_active_alerts", input: {} }];
      if (has("get_environment")) return null;
      const alerts = (first<Alerts>(r, "get_active_alerts")?.data.alerts ?? []).slice(0, 2);
      const ids = [...new Set(alerts.map(guidanceFor))];
      return [...ids.map((ruleId) => ({ toolName: "get_guidance", input: { ruleId } })), { toolName: "get_environment", input: {} }];
    }
    case "radiation":
      return has("get_radiation_status") ? null : [{ toolName: "get_radiation_status", input: {} }, { toolName: "get_environment", input: {} }];
    case "sleep":
      return has("get_sleep_history") ? null : [{ toolName: "get_sleep_history", input: { days: 7 } }];
    case "space_weather":
      return has("get_space_weather") ? null : [{ toolName: "get_space_weather", input: {} }, { toolName: "get_environment", input: {} }];
    case "baseline":
      return has("get_reference_baseline") ? null : [{ toolName: "get_reference_baseline", input: { indicator: indicatorFrom(question) } }];
    case "vitals":
      return has("get_latest_vitals") ? null : [{ toolName: "get_latest_vitals", input: {} }];
    case "environment":
      return has("get_environment") ? null : [{ toolName: "get_environment", input: {} }];
    default:
      return null;
  }
}

/* -------------------------------------------------------------- answers */

const NO_ENV = "No mission environment is chosen yet, so I can't give the comms delay or a projection. Pick one in the top bar (ISS, Lunar surface, Mars transit or Mars surface).";
const cite = (s?: { citation: string }) => (s ? `Source: ${s.citation}` : "");
const pct = (v: number) => `${Math.abs(v)}%`;

function envLine(env: Env | undefined) {
  if (!env || !env.chosen) return NO_ENV;
  return `If you need the ground, the one-way comms delay on ${env.name} is ${env.commsDelayOneWay} (${env.commsRoundTrip} round trip).`;
}

function unavailable(d: unknown): string | null {
  const x = d as { available?: boolean; message?: string } | undefined;
  return x && x.available === false ? (x.message ?? "That data isn't available.") : null;
}

function alertsAnswer(intent: "why_warning" | "what_to_do", r: TurnResults) {
  const a = first<Alerts>(r, "get_active_alerts");
  const env = first<Env>(r, "get_environment")?.data;
  if (!a) return "I couldn't read your alerts.";
  const missing = unavailable(a.data);
  if (missing) return missing;
  const alerts = a.data.alerts;
  if (!alerts.length)
    return [
      "Nothing is on Watch or Escalate for you right now. The rules engine found no active alert in your latest vitals, sleep, dose readings or the hrv_sleep_decline pattern.",
      intent === "what_to_do" ? "Keep logging your vitals, sleep and dosimeter readings so the trends stay complete." : "",
      env && !env.chosen ? NO_ENV : "",
      cite(a.source),
    ]
      .filter(Boolean)
      .join("\n\n");

  const lines: string[] = [];
  lines.push(
    intent === "why_warning"
      ? `You have ${alerts.length === 1 ? "one active alert" : `${alerts.length} active alerts`} from the rules engine:`
      : "Here is what I'd do next, based on your active alerts:",
  );
  for (const al of alerts) lines.push(`- ${al.level === "escalate" ? "Escalate" : "Watch"} · ${al.title} (rule ${al.ruleId}): ${al.detail}`);

  const h = a.data.hrvSleepDecline;
  if (h) {
    lines.push(
      `Why hrv_sleep_decline fired: your HRV (RMSSD) was ${pct(h.averageHrvDropPct)} below your own baseline of ${h.baselineHrvMeanMs} ms on average, on each of the last ${h.flaggedNights.length} nights (the rule needs at least ${h.hrvDropThresholdPct}% down every night, against ${h.baselineNights} baseline nights):`,
    );
    for (const n of h.flaggedNights) lines.push(`- ${n.night}: ${n.hrvMs} ms (${pct(n.hrvPctVsBaseline)} below), ${n.sleepHours} h sleep`);
    lines.push(`Sleep averaged ${h.flaggedSleepAverageHours} h on those nights, against your baseline of ${h.baselineSleepMeanHours} h.${h.dismissedToday ? " You dismissed the card for today; the pattern is still there." : ""}`);
  }

  const guidance = (r.get_guidance ?? []).map((g) => g as { data: Guidance; source: { citation: string } });
  for (const g of guidance) {
    lines.push(`What you can do (${g.data.ruleId}):`);
    for (const s of g.data.steps) lines.push(`- ${s}`);
    lines.push(g.data.whenToContact);
  }
  if (!guidance.length) lines.push(envLine(env));
  if (env && !env.chosen && !lines.some((l) => l.includes("top bar"))) lines.push(NO_ENV);
  lines.push(cite(a.source));
  for (const g of guidance) if (g.source.citation !== a.source.citation) lines.push(cite(g.source));
  return lines.join("\n");
}

function radiationAnswer(r: TurnResults) {
  const rad = first<Data<typeof getRadiationStatus>>(r, "get_radiation_status");
  const env = first<Env>(r, "get_environment")?.data;
  if (!rad) return "I couldn't read your dose log.";
  const missing = unavailable(rad.data);
  if (missing) return missing;
  const d = rad.data as Extract<Data<typeof getRadiationStatus>, { available: true }>;
  const lines = [
    `Your career dose is ${d.careerTotalMsv} mSv, ${d.careerPctOfLimit}% of the ${d.careerLimitMsv} mSv career limit (status: ${d.careerStatus}; Watch from ${d.careerWatchMsv} mSv).`,
  ];
  if (d.latest)
    lines.push(
      `Latest reading: ${d.latest.doseMsv} mSv over ${d.latest.periodHours} h, a rate of ${d.latest.rateMsvPerDay} mSv/d (${d.latest.status}; Watch at ${d.latest.watchLevelMsvPerDay} mSv/d).`,
    );
  else lines.push("You haven't logged a dosimeter reading yet.");
  if (d.projection && d.environment)
    lines.push(
      `A full ${d.environment.missionDays}-day mission on ${d.environment.name} at ${d.environment.typicalDoseMsvPerDay} mSv/d (${d.environment.doseBasis}) would add about ${d.projection.fullMissionMsv} mSv, taking your career total to about ${d.projection.careerAfterMissionMsv} mSv.`,
    );
  else lines.push(NO_ENV);
  if (d.careerStatus !== "normal") lines.push(envLine(env));
  lines.push(cite(rad.source));
  return lines.join("\n\n");
}

function sleepAnswer(r: TurnResults) {
  const s = first<Data<typeof getSleepHistory>>(r, "get_sleep_history");
  if (!s) return "I couldn't read your sleep log.";
  const missing = unavailable(s.data);
  if (missing) return missing;
  const d = s.data as Extract<Data<typeof getSleepHistory>, { available: true }>;
  if (!d.nights.length) return "You haven't logged any nights yet. Log last night on the Sleep & Stress page.";
  const lines = [
    `Over your last ${d.nights.length} logged nights you slept ${d.averageSleepHours} h on average${d.averageHrvMs !== null ? `, with HRV (RMSSD) averaging ${d.averageHrvMs} ms` : ""}${d.personal14NightHrvMeanMs !== null ? ` (your ${d.baselineWindowNights}-night mean is ${d.personal14NightHrvMeanMs} ms)` : ""}.`,
  ];
  for (const n of d.nights) lines.push(`- ${n.night}: ${n.sleepHours} h${n.hrvRmssdMs !== null ? `, HRV ${n.hrvRmssdMs} ms` : ""}${n.stress1to5 !== null ? `, stress ${n.stress1to5}/5` : ""}`);
  if (d.lastNight)
    lines.push(
      d.lastNight.status === "watch"
        ? `Your most recent night (${d.lastNight.night}) is on Watch: ${d.lastNight.reasons.join(" ")}`
        : `Your most recent night (${d.lastNight.night}) is Normal.`,
    );
  lines.push(cite(s.source));
  return lines.join("\n");
}

function spaceWeatherAnswer(r: TurnResults) {
  const sw = first<Data<typeof getSpaceWeather>>(r, "get_space_weather");
  const env = first<Env>(r, "get_environment")?.data;
  if (!sw) return "I couldn't read NASA DONKI.";
  const d = sw.data;
  const lines = [
    `NASA DONKI (${d.origin === "live" ? "live" : "cached copy"}${d.window ? `, ${d.window}` : ""}): ${d.feeds.map((f) => `${f.type} ${f.ok ? f.count : "unavailable"}`).join(", ")}.`,
  ];
  if (d.latestEvents.length) {
    lines.push("Most recent events:");
    for (const e of d.latestEvents.slice(0, 3)) lines.push(`- ${e.type} at ${e.startUtc}${e.detail ? ` (${e.detail})` : ""}`);
  }
  lines.push(env && env.chosen ? `If a solar particle event is announced on ${env.name}: ${env.shelterProcedure}` : NO_ENV);
  lines.push(d.note);
  lines.push(cite(sw.source));
  return lines.join("\n");
}

function baselineAnswer(r: TurnResults) {
  const b = first<Data<typeof getReferenceBaseline>>(r, "get_reference_baseline");
  if (!b) return "I couldn't read the OSD-575 baselines.";
  const missing = unavailable(b.data);
  if (missing) return missing;
  const d = b.data as Extract<Data<typeof getReferenceBaseline>, { available: true }>;
  return [
    `${d.label}: before flight, ${d.analyte} ranged ${d.preflightMin}–${d.preflightMax} ${d.unit} (median ${d.preflightMedian}), from ${d.samples} samples of ${d.crewCount} crew at ${d.timepoints.join(", ")}.`,
    d.labRange ? `The lab's reference range was ${d.labRange.min}–${d.labRange.max} ${d.unit}.` : "",
    d.note,
    `${cite(b.source)}${b.source.url ? ` (${b.source.url})` : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function vitalsAnswer(r: TurnResults) {
  const v = first<Data<typeof getLatestVitals>>(r, "get_latest_vitals");
  if (!v) return "I couldn't read your vitals.";
  const missing = unavailable(v.data);
  if (missing) return missing;
  const d = v.data as Extract<Data<typeof getLatestVitals>, { available: true }>;
  const lines = [`Your latest vitals (${d.takenAtUtc}) are ${d.status === "escalate" ? "Escalate" : d.status === "watch" ? "Watch" : "Normal"}:`];
  for (const m of d.measures) lines.push(`- ${m.measure}: ${m.value} ${m.unit} (${m.status})${m.reason ? `. ${m.reason}` : ""}`);
  lines.push(cite(v.source));
  return lines.join("\n");
}

function environmentAnswer(r: TurnResults) {
  const e = first<Env>(r, "get_environment");
  if (!e) return "I couldn't read your mission environment.";
  if (!e.data.chosen) return NO_ENV;
  const d = e.data;
  return [
    `You're set to ${d.name}. One-way comms delay: ${d.commsDelayOneWay} (${d.commsRoundTrip} round trip). Gravity: ${d.gravity}. Typical dose: ${d.typicalDoseMsvPerDay} mSv/d (Watch at ${d.doseWatchMsvPerDay} mSv/d). Mission length: ${d.missionLength}.`,
    d.groundSupport,
    cite(e.source),
  ].join("\n\n");
}

export const HELP_TEXT =
  "I can explain your alerts (\"Why am I on Watch?\"), your sleep, radiation dose, vitals, space weather, your mission environment and the Inspiration4 reference baselines. I only use your logged data and cited references. I don't diagnose or recommend medication.";

/** The final answer for an intent, built only from this turn's tool results. */
export function answer(intent: Intent, r: TurnResults): string {
  switch (intent) {
    case "why_warning":
    case "what_to_do":
      return alertsAnswer(intent, r);
    case "radiation":
      return radiationAnswer(r);
    case "sleep":
      return sleepAnswer(r);
    case "space_weather":
      return spaceWeatherAnswer(r);
    case "baseline":
      return baselineAnswer(r);
    case "vitals":
      return vitalsAnswer(r);
    case "environment":
      return environmentAnswer(r);
    default:
      return HELP_TEXT;
  }
}
