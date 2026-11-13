/**
 * Server-side safety check on every co-pilot answer, whatever the model
 * (mock, Claude or Ollama). Pure and deterministic.
 *
 * 1. Blocks diagnosis or prescription language and replaces the whole answer
 *    with a safe fallback.
 * 2. Grounding: every number in the answer must appear in a tool result (or
 *    the question). Unmatched numbers are listed in a visible note.
 * 3. Ground contact: an answer that tells the crew member to contact the
 *    flight surgeon / ground must state that environment's comms delay, or
 *    say that no environment is chosen.
 */

const CONDITIONS =
  "hypertension|hypotension|diabetes|hypoglyc(?:a)?emia|hyperglyc(?:a)?emia|sleep apnea|sleep apnoea|insomnia|depression|anxiety disorder|arrhythmia|atrial fibrillation|tachycardia|bradycardia|infection|pneumonia|hypox(?:a)?emia|hypoxia|cancer|radiation sickness|acute radiation syndrome|heart failure|heart attack|heart disease|stroke|concussion|SANS|disorder|syndrome|disease";

const DIAGNOSIS: RegExp[] = [
  // "you have / you're suffering from / you likely have … <condition>"
  new RegExp(
    `\\b(?:you|you've|you're)\\s+(?:(?:probably|likely|possibly|definitely|clearly|already|now)\\s+)?(?:have|has|got|are suffering from|suffering from|suffer from|have developed|developed|are developing|developing|are showing signs of|showing signs of|show signs of|are diagnosed with|likely have|probably have|may have|might have|could have|are experiencing|experiencing)\\b[^.!?\\n]{0,60}\\b(?:${CONDITIONS})\\b`,
    "i",
  ),
  // "this indicates / means / confirms … <condition>"
  new RegExp(`\\b(?:this|these|that|it|your readings?|your data)\\s+(?:is|are|indicates?|means|suggests?|confirms?|points to|is consistent with)\\b[^.!?\\n]{0,40}\\b(?:${CONDITIONS})\\b`, "i"),
  /\b(?:i|we)\s+(?:diagnose|can diagnose|would diagnose)\b/i,
  /\bmy diagnosis\b|\b(?:the|a|your) diagnosis (?:is|of|would be)\b|\bdiagnosed (?:you )?with\b/i,
];

const MEDS =
  "ibuprofen|paracetamol|acetaminophen|aspirin|naproxen|melatonin|zolpidem|zaleplon|modafinil|caffeine (?:pills?|tablets?)|insulin|metformin|glucagon|antibiotics?|sleeping (?:pills?|tablets?)|sedatives?|antidepressants?|beta[- ]blockers?|potassium iodide|steroids?|antihistamines?|medication|medicine|drugs?";

const PRESCRIPTION: RegExp[] = [
  // "take / start / increase … 200 mg"
  /\b(?:take|taking|start|increase|decrease|double|reduce|stop|use|try|give)\b[^.!?\n]{0,40}\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ml|mL|units?|IU|tablets?|pills?|capsules?)\b/i,
  // "take / start / try … melatonin / medication"
  new RegExp(`\\b(?:take|taking|start|starting|increase|use|try|begin)\\b[^.!?\\n]{0,30}\\b(?:${MEDS})\\b`, "i"),
  /\bprescri(?:be|bed|bing|ption)\b|\bdosage of\b|\bmg of\b/i,
];

export const SAFE_FALLBACK =
  "I can't give a diagnosis or recommend medication. I can show what your logged data and the rules say, and help you decide when to contact your Crew Medical Officer or the flight surgeon.";

export interface PostCheckInput {
  text: string;
  /** Everything the tools returned this turn (any JSON). */
  toolOutputs: unknown[];
  /** The user's question (numbers they typed count as grounded). */
  question: string;
  /** One-way comms delay of the subject's environment, or null when none is chosen. */
  environment: { name: string; commsDelayOneWay: string } | null;
}

export interface PostCheckResult {
  text: string;
  blocked: boolean;
  /** Which patterns matched (for logs/tests; never the user's data). */
  reasons: string[];
  ungroundedNumbers: string[];
}

const NUMBER = /(?<![\w.])[-−]?\d+(?:[.,]\d+)?/g;

function numbersIn(text: string) {
  return [...text.matchAll(NUMBER)].map((m) => m[0].replace("−", "-").replace(",", "."));
}

/** A number is grounded if it equals a source number, also after rounding the source to 0–2 decimals, or as an absolute value. */
function isGrounded(n: string, pool: number[]) {
  const v = Math.abs(Number(n));
  if (!Number.isFinite(v)) return true;
  return pool.some((p) => {
    const a = Math.abs(p);
    return a === v || [0, 1, 2].some((d) => Math.round(a * 10 ** d) / 10 ** d === v);
  });
}

const CONTACT = /\b(?:flight surgeon|mission control|ground team|the ground|ground support)\b/i;

export function postCheck(input: PostCheckInput): PostCheckResult {
  const reasons = [
    ...DIAGNOSIS.filter((r) => r.test(input.text)).map(() => "diagnosis"),
    ...PRESCRIPTION.filter((r) => r.test(input.text)).map(() => "prescription"),
  ];
  if (reasons.length) {
    const contact = input.environment
      ? ` For anything medical, contact the flight surgeon (one-way comms delay on ${input.environment.name}: ${input.environment.commsDelayOneWay}).`
      : " For anything medical, contact the flight surgeon. No mission environment is chosen, so the comms delay is unknown; pick one in the top bar.";
    return { text: SAFE_FALLBACK + contact, blocked: true, reasons: [...new Set(reasons)], ungroundedNumbers: [] };
  }

  let text = input.text.trim();

  // Ground contact must carry the comms delay (or say there is no environment).
  if (CONTACT.test(text)) {
    if (input.environment && !text.includes(input.environment.commsDelayOneWay))
      text += `\n\nComms delay to the ground on ${input.environment.name}: ${input.environment.commsDelayOneWay} one way.`;
    else if (!input.environment && !/top bar/i.test(text))
      text += "\n\nNo mission environment is chosen, so I can't give the comms delay. Pick one in the top bar.";
  }

  const pool = [input.question, JSON.stringify(input.toolOutputs), text.slice(input.text.trim().length)].flatMap(numbersIn).map(Number);
  const ungrounded = [...new Set(numbersIn(input.text).filter((n) => !isGrounded(n, pool)))];
  if (ungrounded.length) text += `\n\nNote: ${ungrounded.join(", ")} could not be matched to a tool result. Check the module page before acting on it.`;

  return { text, blocked: false, reasons: [], ungroundedNumbers: ungrounded };
}
