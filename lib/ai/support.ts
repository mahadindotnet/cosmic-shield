/**
 * Mind support conversation, offline (mock) flow. Pure and deterministic.
 *
 * The chat opens with SUPPORT_INTRO (asks about sleep). Each crew answer gets
 * a short supportive reflection and the next question: sleep, workload,
 * connection to crew and family, mood. After the fourth answer the co-pilot
 * looks up sleep and active alerts and summarises with simple coping steps.
 * When the tone of an answer is unclear it reflects neutrally instead of
 * guessing. Never diagnoses, never uses clinical labels, never prescribes.
 */

export type SupportTopic = "sleep" | "workload" | "connection" | "mood";
export type Tone = "positive" | "negative" | "unclear";

export const SUPPORT_QUESTIONS: { topic: SupportTopic; question: string }[] = [
  { topic: "sleep", question: "How have you been sleeping the last few nights?" },
  { topic: "workload", question: "How is your workload feeling at the moment?" },
  { topic: "connection", question: "How connected do you feel to the crew, and to family and friends at home?" },
  { topic: "mood", question: "And overall, how would you describe your mood today?" },
];

export const SUPPORT_INTRO = `Hi, I'm here for a short check-in. There are no right or wrong answers, and you can stop any time. ${SUPPORT_QUESTIONS[0].question}`;

const POSITIVE = [
  "good", "great", "fine", "well", "better", "rested", "calm", "happy", "connected", "close", "manageable", "relaxed",
  "ok", "okay", "alright", "solid", "content", "positive", "energised", "energized", "light", "supported", "steady",
];
const NEGATIVE = [
  "bad", "badly", "poor", "poorly", "tired", "exhausted", "stressed", "overwhelmed", "lonely", "isolated", "alone", "distant",
  "low", "sad", "down", "anxious", "worried", "struggling", "rough", "awful", "terrible", "heavy", "behind", "drained", "restless",
  "frustrated", "irritable", "homesick", "disconnected", "hard", "difficult",
];
const NEGATORS = /\b(?:not|never|hardly|barely|no|isn't|aren't|wasn't|don't|doesn't|didn't|can't|cannot)\s+(?:\w+\s+)?$/;

/**
 * Rough tone of an answer. Only clear cases count: words of one tone and none
 * of the other ("not good" counts as negative). Mixed or neither → unclear.
 */
export function toneOf(text: string): Tone {
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  let pos = 0;
  let neg = 0;
  for (const m of t.matchAll(/[a-z']+/g)) {
    const w = m[0];
    const before = t.slice(Math.max(0, m.index! - 20), m.index!);
    const negated = NEGATORS.test(before);
    const sign = POSITIVE.includes(w) ? 1 : NEGATIVE.includes(w) ? -1 : 0;
    if (sign === 0) continue;
    // "not good" counts as negative, "not tired" as positive.
    if ((sign > 0) !== negated) pos++;
    else neg++;
  }
  if (/\btoo much\b|\bnot enough sleep\b|\bcan't sleep\b|\bcouldn't sleep\b/.test(t)) neg++;
  if (pos > 0 && neg === 0) return "positive";
  if (neg > 0 && pos === 0) return "negative";
  return "unclear";
}

const REFLECTIONS: Record<SupportTopic, Record<Tone, string>> = {
  sleep: {
    positive: "It's good to hear your sleep has been reasonable; that makes a real difference to everything else.",
    negative: "That sounds tiring. When sleep is off, everything else can feel heavier.",
    unclear: "Thanks for telling me how your sleep has been.",
  },
  workload: {
    positive: "Good to hear the workload feels manageable right now.",
    negative: "That sounds like a lot to carry at the moment.",
    unclear: "Thanks for telling me about your workload.",
  },
  connection: {
    positive: "It's good that you feel connected; those links matter a lot on a long mission.",
    negative: "Feeling far from people is hard, especially out here. That's a very normal reaction.",
    unclear: "Thanks for sharing how connected you feel.",
  },
  mood: {
    positive: "I'm glad to hear that.",
    negative: "Thank you for being honest about how you're feeling.",
    unclear: "Thanks for telling me.",
  },
};

export const reflect = (topic: SupportTopic, answer: string) => REFLECTIONS[topic][toneOf(answer)];

const STEPS: Record<SupportTopic, string> = {
  sleep: "Rest: protect your next sleep period, and keep screens and work out of the hour before it.",
  workload: "Workload: tell your commander or the ground what feels like too much; adjusting the plan is normal.",
  connection: "Connection: plan a call or message home, and spend a few minutes with a crewmate today.",
  mood: "Breathing: try a few minutes of slow breathing, with each breath out a little longer than the breath in, when things feel heavy.",
};

export interface SupportSummaryData {
  answers: string[];
  /** From get_sleep_history, when available. */
  sleep: { averageSleepHours: number | null; nights: number } | null;
  /** From get_active_alerts: is the Mind check-in pattern on Watch? */
  mindPatternWatch: boolean;
}

/** The summary after the fourth answer, with coping steps for the topics that sounded hard. */
export function supportSummary(d: SupportSummaryData): string {
  const tones = SUPPORT_QUESTIONS.map((q, i) => ({ topic: q.topic, tone: toneOf(d.answers[i] ?? "") }));
  const hard = tones.filter((t) => t.tone === "negative").map((t) => t.topic);
  const lines = ["Thanks for checking in with me. Here's what I heard:"];
  const word: Record<Tone, string> = { positive: "sounds okay", negative: "sounds hard right now", unclear: "noted" };
  for (const t of tones) lines.push(`- ${t.topic === "connection" ? "Connection" : t.topic[0].toUpperCase() + t.topic.slice(1)}: ${word[t.tone]}`);
  if (d.sleep && d.sleep.averageSleepHours !== null)
    lines.push(`Your logged sleep over the last ${d.sleep.nights} nights averaged ${d.sleep.averageSleepHours} h.`);
  if (d.mindPatternWatch)
    lines.push("Your recent check-ins also show a few hard days in a row. That's worth mentioning to your Crew Medical Officer.");
  lines.push(hard.length ? "Some things that might help:" : "Keep doing what's working. A few things that help on a long mission:");
  const steps = (hard.length ? hard : (["mood", "connection"] as SupportTopic[])).map((t) => STEPS[t]);
  if (!steps.includes(STEPS.connection)) steps.push("Talk to a crewmate you trust about how the week has gone.");
  for (const s of steps) lines.push(`- ${s}`);
  lines.push("Would you like to talk about any of these a bit more?");
  return lines.join("\n");
}

/** Replies after the check-in is complete: a reflection and an open question. */
export function supportFollowUp(answer: string): string {
  const tone = toneOf(answer);
  const reflection =
    tone === "negative" ? "That sounds hard. Thank you for telling me." : tone === "positive" ? "That's good to hear." : "Thanks for telling me.";
  return `${reflection} Rest, slow breathing, talking to a crewmate, a call home or asking for a lighter task are all fair things to reach for. Is there anything else on your mind?`;
}

/** Instructions added for Claude / Ollama in support mode (same rules as the mock). */
export const SUPPORT_PROMPT = `SUPPORT CONVERSATION (Mind page).
You are having a short, supportive check-in with a crew member, not answering data questions.
- Ask one short question at a time, in this order: sleep, workload, feeling connected to crew and family, mood. The first question (sleep) was already asked by the app.
- After each answer, reflect back briefly and kindly in plain words. If you're not sure how they feel, say "Thanks for telling me" rather than guessing.
- After the four answers, summarise in a few bullet points and suggest simple coping steps only: rest, slow breathing, talking to a crewmate, contacting family, asking for a workload adjustment. You may call get_sleep_history and get_active_alerts to ground the summary.
- Never diagnose, never use clinical labels (for example depression, anxiety disorder, PTSD, burnout syndrome), never mention medication.
- Keep every reply under 90 words.`;
