import { describe, expect, it } from "vitest";
import { CMO_LINE, CRISIS_FOLLOW_UP, crisisResponse, detectCrisis } from "./safety";

describe("detectCrisis: triggers", () => {
  it.each([
    ["I feel hopeless and I can't cope anymore", ["hopelessness", "unable_to_cope"]],
    ["I feel completely hopeless", ["hopelessness"]],
    ["there's no hope for me", ["hopelessness"]],
    ["Nothing will ever get better", ["hopelessness"]],
    ["I can't cope", ["unable_to_cope"]],
    ["I cannot go on like this", ["unable_to_cope"]],
    ["I can’t take it anymore", ["unable_to_cope"]],
    ["I'm at my breaking point", ["unable_to_cope"]],
    ["I want to die", ["wanting_to_die"]],
    ["sometimes I wish I were dead", ["wanting_to_die"]],
    ["I don't want to be here anymore", ["wanting_to_die"]],
    ["I've been thinking about suicide", ["wanting_to_die"]],
    ["I want to end it all", ["wanting_to_die"]],
    ["they'd be better off without me", ["wanting_to_die"]],
    ["I want to hurt myself", ["self_harm"]],
    ["I've been self-harming", ["self_harm"]],
  ])("%s", (text, categories) => {
    const r = detectCrisis(text);
    expect(r.triggered).toBe(true);
    expect(r.categories).toEqual(categories);
  });
});

describe("detectCrisis: everyday phrases don't trigger", () => {
  it.each([
    "I'm dying to see my family",
    "the dosimeter battery is dead",
    "I could kill for a pizza",
    "I'd die for a proper coffee",
    "I hope the storm passes",
    "I can cope with the workload",
    "the EVA went well, no problems",
    "I'm tired but okay",
    "what's the point of this test?",
    "I cut my finger on a panel",
  ])("%s", (text) => {
    expect(detectCrisis(text).triggered).toBe(false);
  });
});

describe("crisis responses", () => {
  it("first response: warm, not alone, CMO now, the ground with the comms delay, offers to stay", () => {
    const t = crisisResponse({ name: "Mars transit", commsDelayOneWay: "3–22 min" });
    expect(t).toContain("I'm really sorry you're feeling this way");
    expect(t).toContain("You're not alone in this.");
    expect(t).toContain("Talk to your Crew Medical Officer right away.");
    expect(t).toContain("ground behavioural health support");
    expect(t).toContain("On Mars transit, messages take 3–22 min each way");
    expect(t).toContain("I can stay in this conversation with you");
    // Calm: no clinical labels, no alarm words.
    expect(t).not.toMatch(/emergency|danger|suicid|depress/i);
  });

  it("without an environment it still puts the CMO first", () => {
    const t = crisisResponse(null);
    expect(t).toContain("your Crew Medical Officer is the first step");
    expect(t).not.toContain("top bar");
  });

  it("follow-up is a short reminder with the CMO line", () => {
    expect(CRISIS_FOLLOW_UP).toContain(CMO_LINE);
    expect(CRISIS_FOLLOW_UP.length).toBeLessThan(crisisResponse(null).length / 2);
  });
});
