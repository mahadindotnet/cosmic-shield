import { describe, expect, it } from "vitest";
import { classifyFundusPhoto } from "./classifier";
import { amslerChanged, changedRun, describeAmsler, evaluateAmsler, EYE_LIMITS, parseMarks, SANS_RISK, VISION_CHANGE_MESSAGE, type AmslerTest } from "./rules";
import { amslerInput, fundusInput } from "./schema";
import { summarizeEyes, type EyeRow } from "./summary";

let id = 0;
const test_ = (eye: "left" | "right", marks: [number, number][], centreVisible = true, day = 10): AmslerTest => ({
  id: ++id,
  recordedAt: `2026-11-${String(day).padStart(2, "0")}T08:00:00.000Z`,
  eye,
  marks,
  centreVisible,
});

describe("Amsler rule (app default, Watch only)", () => {
  it("nothing marked and centre dot seen: no change", () => {
    expect(amslerChanged({ marks: [], centreVisible: true })).toBe(false);
    expect(describeAmsler({ marks: [], centreVisible: true })).toBe("No change noticed");
  });

  it("a marked cell, or the centre dot not seen, is a change", () => {
    expect(amslerChanged({ marks: [[3, 4]], centreVisible: true })).toBe(true);
    expect(amslerChanged({ marks: [], centreVisible: false })).toBe(true);
    expect(describeAmsler({ marks: [[1, 1], [1, 2]], centreVisible: false })).toBe("2 cells marked; centre dot not seen");
  });

  it("no tests: no-data; latest normal for both eyes: normal", () => {
    expect(evaluateAmsler([]).status).toBe("no-data");
    expect(evaluateAmsler([test_("left", [[2, 2]], true, 9), test_("left", [], true, 10), test_("right", [])]).status).toBe("normal");
  });

  it("the latest test of either eye decides; the message is the agreed wording", () => {
    const e = evaluateAmsler([test_("left", []), test_("right", [[9, 10], [10, 10]], true, 11)]);
    expect(e.status).toBe("watch");
    expect(e.changedEyes).toEqual(["right"]);
    expect(e.reason).toBe(`${VISION_CHANGE_MESSAGE} Right eye: 2 cells marked.`);
    expect(e.reason).not.toMatch(/SANS|diagnos|syndrome|disease/i);
  });

  it("changes on 2 tests in a row of the same eye: repeat (surgeon told)", () => {
    const one = [test_("left", [[1, 1]], true, 10), test_("right", [[1, 1]], true, 11)];
    expect(evaluateAmsler(one).repeatEyes).toEqual([]);
    const two = [test_("left", [[1, 1]], true, 10), test_("left", [], false, 11)];
    const e = evaluateAmsler(two);
    expect(e.repeatEyes).toEqual(["left"]);
    expect(e.reason).toContain("Changes on 2 tests in a row: the flight surgeon has been told.");
    expect(changedRun([test_("left", [[1, 1]], true, 8), test_("left", [], true, 9), test_("left", [[1, 1]], true, 10)])).toBe(1);
    expect(EYE_LIMITS.repeatTestsForSurgeon).toBe(2);
  });

  it("parseMarks keeps only valid cells on the 20 × 20 grid", () => {
    expect(parseMarks("[[0,0],[19,19],[20,1],[-1,2],[1.5,2],\"x\"]")).toEqual([
      [0, 0],
      [19, 19],
    ]);
    expect(parseMarks("not json")).toEqual([]);
    expect(parseMarks(null)).toEqual([]);
  });
});

describe("input schemas", () => {
  it("Amsler: eye required; marks deduplicated and sorted; centre dot", () => {
    const r = amslerInput.parse({ eye: "left", marks: "[[5,3],[1,2],[5,3]]", centreVisible: "no", note: " " });
    expect(r).toEqual({ eye: "left", marks: [[1, 2], [5, 3]], centreVisible: false, note: null });
    expect(amslerInput.parse({ eye: "right", marks: "", centreVisible: "yes", note: "" })).toMatchObject({ marks: [], centreVisible: true });
    expect(amslerInput.safeParse({ eye: "", marks: "", centreVisible: "yes", note: "" }).error?.issues[0].message).toBe("Choose the eye.");
    expect(amslerInput.safeParse({ eye: "left", marks: "[[30,1]]", centreVisible: "yes", note: "" }).success).toBe(false);
    expect(amslerInput.safeParse({ eye: "left", marks: "{bad", centreVisible: "yes", note: "" }).success).toBe(false);
  });

  it("fundus: ground review is a checkbox", () => {
    expect(fundusInput.parse({ eye: "right", groundReview: "on", note: "" })).toEqual({ eye: "right", groundReview: true, note: null });
    expect(fundusInput.parse({ eye: "right", groundReview: "", note: "" }).groundReview).toBe(false);
  });
});

describe("summarizeEyes", () => {
  const row = (r: Partial<EyeRow> & Pick<EyeRow, "id" | "recordedAt" | "kind" | "eye">): EyeRow => ({
    source: "manual",
    marks: [],
    centreVisible: r.kind === "amsler" ? true : null,
    hasPhoto: false,
    photoAnalysis: null,
    groundReview: false,
    note: null,
    ...r,
  });

  it("history newest first with results; tile counts marked cells of the latest tests", () => {
    const s = summarizeEyes([
      row({ id: 1, recordedAt: "2026-11-10T08:00:00Z", kind: "amsler", eye: "left" }),
      row({ id: 2, recordedAt: "2026-11-11T08:00:00Z", kind: "amsler", eye: "right", marks: [[1, 1], [1, 2], [2, 2]] }),
      row({ id: 3, recordedAt: "2026-11-12T08:00:00Z", kind: "fundus", eye: "left", hasPhoto: true, photoAnalysis: "not_analysed", groundReview: true }),
    ]);
    expect(s.history.map((r) => r.id)).toEqual([3, 2, 1]);
    expect(s.history[0]).toMatchObject({ result: "Not analysed: prototype · flagged for ground review", status: null });
    expect(s.history[1]).toMatchObject({ result: "3 cells marked", status: "watch" });
    expect(s.history[2]).toMatchObject({ result: "No change noticed", status: "normal" });
    expect(s.lastFundus?.id).toBe(3);
    expect(s.lastScreeningAt).toBe("2026-11-12T08:00:00Z");
    expect(s.tile).toEqual({ metric: "Amsler: cells marked (latest)", value: "3", unit: "cells", status: "watch" });
  });

  it("no Amsler test: no tile (a fundus photo alone has no status)", () => {
    const s = summarizeEyes([row({ id: 4, recordedAt: "2026-11-12T08:00:00Z", kind: "fundus", eye: "right", hasPhoto: true, photoAnalysis: "not_analysed" })]);
    expect(s.tile).toBeNull();
    expect(s.amsler.status).toBe("no-data");
  });
});

describe("prototype classifier and citation", () => {
  it("never analyses a fundus photo", () => {
    expect(classifyFundusPhoto()).toEqual({ analysed: false, status: "not_analysed", label: "Not analysed: prototype", finding: null });
  });
  it("cites the NASA HRP SANS risk", () => {
    expect(SANS_RISK).toMatchObject({ title: "Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)", url: "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105" });
  });
});
