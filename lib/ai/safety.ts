/**
 * Crisis check for the co-pilot and Mind check-in notes. Pure and deterministic.
 *
 * Simple phrase matching: it looks for hopelessness, self-harm, wanting to
 * die, or feeling unable to cope. It can miss messages and it is not a
 * clinical tool; it is an extra safety net that makes sure such a message
 * reaches the Crew Medical Officer and the flight surgeon, never a
 * replacement for them. See docs/ai-disclosure.md.
 */

export type CrisisCategory = "wanting_to_die" | "self_harm" | "hopelessness" | "unable_to_cope";

export interface CrisisResult {
  triggered: boolean;
  categories: CrisisCategory[];
}

const PATTERNS: Record<CrisisCategory, RegExp[]> = {
  wanting_to_die: [
    /\b(?:want|wanna|wanting|wish|going|plan(?:ning)?|ready)\s+(?:to\s+)?die\b/,
    /\bwish(?:ed)?\s+(?:i\s+)?(?:was|were|'d been|had been|could be)\s+dead\b/,
    /\b(?:kill|killing|end|ending|take|taking)\s+(?:myself|my\s+(?:own\s+)?life)\b/,
    /\bsuicid(?:e|al)\b/,
    /\b(?:don'?t|do not|no longer|not)\s+(?:want|wanting)\s+to\s+(?:live|be alive|be here|exist|wake up)\b/,
    /\bno\s+(?:reason|point)\s+(?:to|in)\s+(?:live|living|going on|go on|being here)\b/,
    /\bbetter\s+off\s+(?:dead|without me|if i (?:was|were)n'?t here)\b/,
    /\bend\s+it\s+all\b/,
  ],
  self_harm: [/\b(?:hurt|hurting|harm|harming|cut|cutting|injure|injuring|punish|punishing)\s+myself\b/, /\bself[-\s]?harm/],
  hopelessness: [
    /\bhopeless(?:ness)?\b/,
    /\b(?:no|lost all|lost|without|there'?s no)\s+hope\b/,
    /\bnothing\s+(?:will\s+)?(?:ever\s+)?(?:get|gets|getting)\s+better\b/,
    /\bwhat'?s\s+the\s+point\s+(?:of|in)\s+(?:anything|living|life|it all|going on)\b/,
    /\bcan'?t\s+see\s+a\s+way\s+(?:out|forward)\b/,
  ],
  unable_to_cope: [
    /\b(?:can'?t|cannot|can not|unable to|not able to|no longer able to)\s+(?:cope|go on|keep going|carry on|take (?:it|this|any more|anymore))\b/,
    /\b(?:can'?t|cannot)\s+(?:handle|deal with)\s+(?:it|this|anything)\s+any\s?more\b/,
    /\b(?:reached|at)\s+(?:my|the)\s+breaking\s+point\b/,
  ],
};

/** Lower-cases and normalises curly apostrophes so "can’t" matches "can't". */
const normalise = (text: string) => text.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ");

export function detectCrisis(text: string): CrisisResult {
  const t = normalise(text);
  const categories = (Object.keys(PATTERNS) as CrisisCategory[]).filter((c) => PATTERNS[c].some((re) => re.test(t)));
  return { triggered: categories.length > 0, categories };
}

/** Always visible at the bottom of the Mind page and the support chat. */
export const CMO_LINE = "If you feel unsafe or unable to cope, contact your Crew Medical Officer now.";

/** Escalation reason shown in lists (never the message itself). */
export const SAFETY_REASON = "Safety check: a message mentioned feeling unable to cope, hopelessness or self-harm.";

export const MIND_SAFETY_ID = "mind_safety" as const;

/**
 * The first caring response in a conversation: warm and short, not alarming.
 * Acknowledges, says they're not alone, gives the clear steps (CMO now; flight
 * surgeon / ground behavioural health with the comms delay) and offers to stay.
 */
export function crisisResponse(environment: { name: string; commsDelayOneWay: string } | null) {
  const ground = environment
    ? `Contact the flight surgeon or ground behavioural health support too. On ${environment.name}, messages take ${environment.commsDelayOneWay} each way, so start with your Crew Medical Officer.`
    : "Contact the flight surgeon or ground behavioural health support too. If the ground can't answer straight away, your Crew Medical Officer is the first step.";
  return [
    "I'm really sorry you're feeling this way, and thank you for telling me. You're not alone in this.",
    "Please reach out now:",
    "- Talk to your Crew Medical Officer right away. They're on board with you.",
    `- ${ground}`,
    "I've let the flight surgeon know, so someone can follow up with you.",
    "I'm here, and I can stay in this conversation with you while you reach out.",
  ].join("\n");
}

/** Later messages in the same conversation get this shorter reminder instead of the full block. */
export const CRISIS_FOLLOW_UP = `I'm still here with you. The flight surgeon has been told. ${CMO_LINE}`;
