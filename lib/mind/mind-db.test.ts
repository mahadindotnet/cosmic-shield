/**
 * Mind data, safety escalations and access control against a real (temporary)
 * SQLite database, plus the offline support conversation through the real
 * AI SDK tool loop.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ModelMessage } from "ai";
import type { UserRow } from "@/lib/auth/users";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-mind-"));
const url = `file:${path.join(dir, "mind.db")}`;
process.env.DATABASE_URL = url;
delete process.env.AI_PROVIDER;
delete process.env.NASA_API_KEY;

let mind: typeof import("./data");
let safety: typeof import("./safety-escalation");
let copilotData: typeof import("@/lib/ai/copilot-data");
let agent: typeof import("@/lib/ai/agent");
let a: UserRow; // CS-201
let b: UserRow; // CS-202
let fsu: UserRow; // FS-201

beforeAll(async () => {
  const { runMigrations } = await import("@/scripts/migrate");
  runMigrations(url);
  const { db } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const now = new Date().toISOString();
  const user = (crewId: string, role: "crew" | "flight_surgeon") =>
    db.insert(s.users).values({ crewId, displayName: crewId, role, title: "", profileId: null, pinHash: "x", environment: "mars-transit", createdAt: now }).returning().get();
  a = user("CS-201", "crew");
  b = user("CS-202", "crew");
  fsu = user("FS-201", "flight_surgeon");
  mind = await import("./data");
  safety = await import("./safety-escalation");
  copilotData = await import("@/lib/ai/copilot-data");
  agent = await import("@/lib/ai/agent");
});

afterAll(() => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // SQLite may still hold the file on Windows; the OS cleans temp files.
  }
});

describe("check-ins", () => {
  it("a normal note is saved privately; a concerning note also creates a mind_safety escalation", () => {
    expect(mind.recordCheckin(a, a.id, { mood: 4, stress: 2, sleepQuality: 4, note: "Good EVA prep today" })).toEqual({ safety: false, escalationId: null });
    const r = mind.recordCheckin(a, a.id, { mood: 1, stress: 5, sleepQuality: null, note: "I feel hopeless and I can't cope anymore" });
    expect(r.safety).toBe(true);
    const records = safety.escalationsForReview(fsu, a.id);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ ruleId: "mind_safety" });
    expect(records[0].evidence).toMatchObject({ source: "checkin_note", messages: [{ text: "I feel hopeless and I can't cope anymore" }] });
  });

  it("the crew member sees their notes; the flight surgeon sees scores only", () => {
    expect(mind.mindSummaryFor(a.id).history.map((h) => h.note)).toContain("Good EVA prep today");
    const review = mind.mindSummaryForReview(fsu, a.id);
    expect(review.history).toHaveLength(2);
    expect(review.history.every((h) => h.note === null)).toBe(true);
    expect(review.history[0]).toMatchObject({ mood: 1, stress: 5 });
  });
});

describe("safety escalations: access and de-duplication", () => {
  it("one open record per conversation; later messages are added to it", () => {
    const first = safety.recordSafetyEscalation(b, { source: "support_chat", conversationId: "conv-1", categories: ["hopelessness"], recentMessages: ["hi", "I feel hopeless"] });
    const again = safety.recordSafetyEscalation(b, { source: "support_chat", conversationId: "conv-1", categories: ["unable_to_cope"], recentMessages: ["hi", "I feel hopeless", "I can't cope"] });
    const other = safety.recordSafetyEscalation(b, { source: "copilot_chat", conversationId: "conv-2", categories: ["self_harm"], recentMessages: ["I want to hurt myself"] });
    expect(again).toBe(first);
    expect(other).not.toBe(first);
    const records = safety.escalationsForReview(fsu, b.id);
    expect(records).toHaveLength(2);
    const conv1 = records.find((r) => r.id === first)!.evidence as import("./safety-escalation").SafetyEvidence;
    expect(conv1.categories).toEqual(["hopelessness", "unable_to_cope"]);
    expect(conv1.messages.map((m) => m.text)).toEqual(["hi", "I feel hopeless", "I can't cope"]);
  });

  it("only the flight surgeon can read escalation evidence: crew get a 403, even for their own records", () => {
    expect(() => safety.escalationsForReview(a, b.id)).toThrow("Not allowed");
    expect(() => safety.escalationsForReview(b, b.id)).toThrow("Not allowed");
    expect(() => mind.mindSummaryForReview(a, b.id)).toThrow("Not allowed");
  });

  it("a crew member's co-pilot never sees another crew member's escalations, and never sees excerpts", () => {
    const alertsA = copilotData.getActiveAlerts({ viewer: a, subject: a }).data;
    const alertsB = copilotData.getActiveAlerts({ viewer: b, subject: b }).data;
    const json = JSON.stringify(alertsA);
    expect(json).not.toContain("I want to hurt myself");
    expect(json).not.toContain("conv-1");
    expect((alertsA.openEscalationRecords ?? []).every((e) => !("evidenceJson" in e))).toBe(true);
    expect(JSON.stringify(alertsB)).not.toContain("I can't cope anymore");
    expect(alertsB.openEscalationRecords ?? []).toHaveLength(2);
    expect((alertsB.openEscalationRecords ?? []).every((e) => e.reason.startsWith("Safety check"))).toBe(true);
  });
});

describe("support conversation (offline mock through the real tool loop)", () => {
  async function turn(history: ModelMessage[], text: string) {
    const messages: ModelMessage[] = [...history, { role: "user", content: text }];
    const run = await agent.runCopilot({ viewer: a, subject: a }, messages, text, undefined, "support");
    return { run, history: [...messages, { role: "assistant", content: run.text } as ModelMessage] };
  }

  it("reflects, asks the next question, then summarises with coping steps grounded in tools", async () => {
    let h: ModelMessage[] = [];
    let t = await turn(h, "Badly, I keep waking up");
    expect(t.run.text).toContain("That sounds tiring.");
    expect(t.run.text).toContain("How is your workload feeling at the moment?");
    h = t.history;
    t = await turn(h, "the usual");
    expect(t.run.text).toContain("Thanks for telling me about your workload.");
    expect(t.run.text).toContain("How connected do you feel");
    h = t.history;
    t = await turn(h, "I feel lonely");
    expect(t.run.text).toContain("Feeling far from people is hard");
    h = t.history;
    t = await turn(h, "pretty low");
    expect(t.run.tools.map((x) => x.toolName)).toEqual(["get_sleep_history", "get_active_alerts"]);
    expect(t.run.text).toContain("Here's what I heard:");
    expect(t.run.text).toContain("Connection:");
    expect(t.run.text).toContain("Rest:");
    expect(t.run.blocked).toBe(false);
    expect(t.run.ungroundedNumbers).toEqual([]);
  });
});
