import { describe, expect, it } from "vitest";
import { postCheck, SUPPORT_FALLBACK } from "./post-check";
import { reflect, SUPPORT_INTRO, SUPPORT_QUESTIONS, supportFollowUp, supportSummary, toneOf } from "./support";

describe("toneOf: only clear cases count", () => {
  it.each([
    ["Sleeping well, thanks", "positive"],
    ["pretty good actually", "positive"],
    ["not tired at all", "positive"],
    ["badly, I keep waking up", "negative"],
    ["not good", "negative"],
    ["I'm exhausted and stressed", "negative"],
    ["too much on my plate", "negative"],
    ["good but tired", "unclear"],
    ["the usual", "unclear"],
    ["six hours", "unclear"],
    ["", "unclear"],
  ])("%s → %s", (text, tone) => {
    expect(toneOf(text)).toBe(tone);
  });
});

describe("support flow", () => {
  it("opens on the sleep question and asks four topics in order", () => {
    expect(SUPPORT_INTRO).toContain(SUPPORT_QUESTIONS[0].question);
    expect(SUPPORT_QUESTIONS.map((q) => q.topic)).toEqual(["sleep", "workload", "connection", "mood"]);
  });

  it("reflects neutrally when the tone is unclear, instead of guessing", () => {
    expect(reflect("sleep", "good but tired")).toBe("Thanks for telling me how your sleep has been.");
    expect(reflect("workload", "the usual")).toBe("Thanks for telling me about your workload.");
    expect(reflect("connection", "lonely and far away")).toContain("Feeling far from people is hard");
  });

  it("summary suggests coping steps for the hard topics and grounds sleep in the tool result", () => {
    const t = supportSummary({
      answers: ["badly", "too much", "fine", "low"],
      sleep: { averageSleepHours: 5.9, nights: 7 },
      mindPatternWatch: true,
    });
    expect(t).toContain("- Sleep: sounds hard right now");
    expect(t).toContain("- Connection: sounds okay");
    expect(t).toContain("Your logged sleep over the last 7 nights averaged 5.9 h.");
    expect(t).toContain("Rest:");
    expect(t).toContain("Workload:");
    expect(t).toContain("Breathing:");
    expect(t).toContain("worth mentioning to your Crew Medical Officer");
  });

  it("all-positive answers get gentle maintenance steps", () => {
    const t = supportSummary({ answers: ["good", "manageable", "close to everyone", "happy"], sleep: null, mindPatternWatch: false });
    expect(t).toContain("Keep doing what's working.");
    expect(t).toContain("Connection:");
  });

  it("support templates pass the post-check (no labels, no ungrounded numbers)", () => {
    const texts = [
      SUPPORT_INTRO,
      reflect("mood", "awful"),
      supportFollowUp("I'm stressed"),
      supportSummary({ answers: ["badly", "too much", "lonely", "low"], sleep: null, mindPatternWatch: false }),
    ];
    for (const text of texts) {
      const r = postCheck({ text, toolOutputs: [], question: "", environment: null, purpose: "support" });
      expect(r.blocked, text).toBe(false);
      expect(r.ungroundedNumbers, text).toEqual([]);
    }
  });
});

describe("post-check in support mode blocks clinical labels", () => {
  it.each(["It sounds like you might have depression.", "These feelings are common with burnout syndrome.", "That could be PTSD.", "This is insomnia."])(
    "%s",
    (text) => {
      const r = postCheck({ text, toolOutputs: [], question: "", environment: null, purpose: "support" });
      expect(r.blocked).toBe(true);
      expect(r.text).toBe(SUPPORT_FALLBACK);
    },
  );
});
