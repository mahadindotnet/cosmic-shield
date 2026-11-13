import { describe, expect, it } from "vitest";
import { answer, guidanceFor, indicatorFrom, matchIntent, nextToolCalls, type TurnResults } from "./intents";

describe("matchIntent", () => {
  it.each([
    ["Why am I seeing this warning?", "why_warning"],
    ["why am I on watch", "why_warning"],
    ["What's my status?", "why_warning"],
    ["What should I do?", "what_to_do"],
    ["radiation", "radiation"],
    ["What's my career dose?", "radiation"],
    ["How did I sleep?", "sleep"],
    ["my HRV lately", "sleep"],
    ["Any space weather?", "space_weather"],
    ["solar flares this week", "space_weather"],
    ["What is my baseline?", "baseline"],
    ["Inspiration4 glucose reference range", "baseline"],
    ["latest blood pressure", "vitals"],
    ["What's the comms delay?", "environment"],
    ["hello", "help"],
  ])("%s → %s", (q, intent) => {
    expect(matchIntent(q)).toBe(intent);
  });

  it("picks the baseline indicator from the question (glucose by default)", () => {
    expect(indicatorFrom("my calcium baseline")).toBe("calcium");
    expect(indicatorFrom("urea nitrogen reference")).toBe("bun");
    expect(indicatorFrom("what is my baseline")).toBe("glucose");
  });
});

const src = (label: string, citation = `${label} citation`) => ({ label, citation });

describe("nextToolCalls (tool plan, at most two tool steps)", () => {
  it("why_warning: alerts first, then guidance for each alert plus the environment, then answer", () => {
    expect(nextToolCalls("why_warning", "", {})).toEqual([{ toolName: "get_active_alerts", input: {} }]);
    const r: TurnResults = {
      get_active_alerts: [{ data: { available: true, alerts: [{ ruleId: "hrv_sleep_decline", level: "watch", title: "", detail: "" }] }, source: src("Rules engine") }],
    };
    expect(nextToolCalls("why_warning", "", r)).toEqual([
      { toolName: "get_guidance", input: { ruleId: "hrv_sleep_decline" } },
      { toolName: "get_environment", input: {} },
    ]);
    r.get_environment = [{ data: { chosen: false }, source: src("Account") }];
    expect(nextToolCalls("why_warning", "", r)).toBeNull();
  });

  it("radiation asks for dose status and environment in one step", () => {
    expect(nextToolCalls("radiation", "", {})).toEqual([
      { toolName: "get_radiation_status", input: {} },
      { toolName: "get_environment", input: {} },
    ]);
  });

  it("maps escalating vitals to the right guidance", () => {
    expect(guidanceFor({ ruleId: "vitals", level: "escalate", detail: "SpO₂ 88 % is below the Escalate level (90 %)." })).toBe("vitals_spo2");
    expect(guidanceFor({ ruleId: "vitals", level: "escalate", detail: "Systolic 185 mmHg is above the Escalate level (180 mmHg)." })).toBe("vitals_blood_pressure");
    expect(guidanceFor({ ruleId: "vitals", level: "watch", detail: "Systolic 150 mmHg is at or above the Watch level (135 mmHg)." })).toBe("vitals");
  });
});

describe("answer templates (filled only from tool results)", () => {
  it("why_warning names hrv_sleep_decline, the HRV % drop, the steps, the comms delay and the citation", () => {
    const r: TurnResults = {
      get_active_alerts: [
        {
          data: {
            available: true,
            alerts: [{ ruleId: "hrv_sleep_decline", level: "watch", title: "HRV has dropped for three nights. Sleep is down.", detail: "HRV 20.7% below your own baseline." }],
            hrvSleepDecline: {
              flaggedNights: [
                { night: "2026-11-10", hrvMs: 37, hrvPctVsBaseline: -19.1, sleepHours: 5.4 },
                { night: "2026-11-11", hrvMs: 35, hrvPctVsBaseline: -23.5, sleepHours: 5.1 },
                { night: "2026-11-12", hrvMs: 36, hrvPctVsBaseline: -21.3, sleepHours: 5.3 },
              ],
              averageHrvPctVsBaseline: -21.3,
              averageHrvDropPct: 21.3,
              baselineHrvMeanMs: 45.7,
              baselineSleepMeanHours: 7.2,
              flaggedSleepAverageHours: 5.27,
              hrvDropThresholdPct: 10,
              baselineNights: 11,
              dismissedToday: false,
            },
          },
          source: src("Rules engine", "NASA Human Research Program, Human Research Roadmap"),
        },
      ],
      get_guidance: [
        {
          data: { ruleId: "hrv_sleep_decline", steps: ["Protect your next sleep period."], whenToContact: "If it continues, contact the flight surgeon (one-way comms delay on ISS: < 1 s)." },
          source: src("NASA HRP"),
        },
      ],
      get_environment: [{ data: { chosen: true, name: "ISS", commsDelayOneWay: "< 1 s", commsRoundTrip: "< 2 s" }, source: src("Mission environment") }],
    };
    const text = answer("why_warning", r);
    expect(text).toContain("hrv_sleep_decline");
    expect(text).toContain("21.3% below your own baseline of 45.7 ms");
    expect(text).toContain("- 2026-11-11: 35 ms (23.5% below), 5.1 h sleep");
    expect(text).toContain("Protect your next sleep period.");
    expect(text).toContain("one-way comms delay on ISS: < 1 s");
    expect(text).toContain("Source: NASA Human Research Program");
  });

  it("radiation answer gives the career total against 600 mSv, and asks for an environment when none is chosen", () => {
    const r: TurnResults = {
      get_radiation_status: [
        {
          data: {
            available: true,
            careerTotalMsv: 128.04,
            careerLimitMsv: 600,
            careerPctOfLimit: 21.3,
            careerStatus: "normal",
            careerWatchMsv: 300,
            latest: null,
            environment: null,
            projection: null,
          },
          source: src("Dose log", "NASA-STD-3001"),
        },
      ],
      get_environment: [{ data: { chosen: false }, source: src("Account") }],
    };
    const text = answer("radiation", r);
    expect(text).toContain("Your career dose is 128.04 mSv, 21.3% of the 600 mSv career limit");
    expect(text).toContain("Pick one in the top bar");
  });

  it("says when the flight surgeon has no crew member selected", () => {
    const r: TurnResults = { get_latest_vitals: [{ data: { available: false, message: "No crew member selected." }, source: src("Vitals log") }] };
    expect(answer("vitals", r)).toBe("No crew member selected.");
  });
});
