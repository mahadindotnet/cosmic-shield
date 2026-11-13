import { describe, expect, it } from "vitest";
import { postCheck, SAFE_FALLBACK } from "./post-check";

const iss = { name: "ISS", commsDelayOneWay: "< 1 s" };
const base = { toolOutputs: [{ data: { careerTotalMsv: 128.04, careerLimitMsv: 600, hrvPct: -21.3 } }], question: "", environment: iss };

describe("postCheck: diagnosis and prescription are blocked", () => {
  it.each([
    "Based on these numbers, you have sleep apnea.",
    "You're probably developing hypertension.",
    "This indicates atrial fibrillation.",
    "Your readings are consistent with hypoglycemia.",
    "My diagnosis is chronic insomnia.",
  ])("diagnosis: %s", (text) => {
    const r = postCheck({ ...base, text });
    expect(r.blocked).toBe(true);
    expect(r.reasons).toEqual(["diagnosis"]);
    expect(r.text).toContain(SAFE_FALLBACK);
    expect(r.text).toContain("one-way comms delay on ISS: < 1 s");
  });

  it.each([
    "Take 3 mg of melatonin before sleep.",
    "You could try melatonin tonight.",
    "Start taking ibuprofen for the headache.",
    "I'd prescribe a sleeping pill.",
    "Increase your insulin.",
  ])("prescription: %s", (text) => {
    const r = postCheck({ ...base, text });
    expect(r.blocked).toBe(true);
    expect(r.reasons).toContain("prescription");
  });

  it("without an environment, the fallback says to pick one in the top bar", () => {
    const r = postCheck({ ...base, environment: null, text: "You have insomnia." });
    expect(r.text).toContain("pick one in the top bar");
  });
});

describe("postCheck: safe answers pass", () => {
  it.each([
    "Your career dose is 128.04 mSv, 21.3% of the 600 mSv career limit. Decision support, not a diagnosis.",
    "Take your blood pressure again after five minutes.",
    "Your HRV was 21.3% below your own baseline. This isn't a diagnosis.",
  ])("%s", (text) => {
    const r = postCheck({ ...base, text });
    expect(r.blocked).toBe(false);
    expect(r.ungroundedNumbers).toEqual([]);
  });
});

describe("postCheck: grounding and ground contact", () => {
  it("flags numbers that no tool returned", () => {
    const r = postCheck({ ...base, text: "Your career dose is 450 mSv." });
    expect(r.ungroundedNumbers).toEqual(["450"]);
    expect(r.text).toContain("Note: 450 could not be matched to a tool result.");
  });

  it("accepts rounded and absolute forms of tool numbers, and numbers from the question", () => {
    const r = postCheck({ ...base, question: "what about 7 days?", text: "About 128 mSv; HRV 21.3% down over 7 days." });
    expect(r.ungroundedNumbers).toEqual([]);
  });

  it("adds the comms delay when the answer says to contact the flight surgeon without it", () => {
    const r = postCheck({ ...base, text: "If it continues, contact the flight surgeon." });
    expect(r.text).toContain("Comms delay to the ground on ISS: < 1 s one way.");
    expect(r.ungroundedNumbers).toEqual([]);
  });

  it("says no environment is chosen when there is none", () => {
    const r = postCheck({ ...base, environment: null, text: "Contact the flight surgeon." });
    expect(r.text).toContain("No mission environment is chosen, so I can't give the comms delay. Pick one in the top bar.");
  });
});
