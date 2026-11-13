/**
 * Co-pilot tools against a real (temporary) SQLite database: each tool reads
 * only the scoped crew member, a flight surgeon sees only the crew member they
 * selected, and the offline agent runs the real tool loop end to end.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { UserRow } from "@/lib/auth/users";
import type { CopilotContext } from "./copilot-data";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-copilot-"));
const url = `file:${path.join(dir, "copilot.db")}`;
process.env.DATABASE_URL = url;
delete process.env.AI_PROVIDER; // offline mock
delete process.env.NASA_API_KEY; // cached DONKI

let data: typeof import("./copilot-data");
let agent: typeof import("./agent");
let tools: typeof import("./tools");
let a: UserRow; // CS-101: ISS, BP 150/95, dose entries
let b: UserRow; // CS-102: no environment, hrv_sleep_decline pattern
let fs1: UserRow; // flight surgeon

beforeAll(async () => {
  const { runMigrations } = await import("@/scripts/migrate");
  runMigrations(url);
  const { db } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const { demoNightlySeries } = await import("@/lib/demo/nightly");
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const user = (crewId: string, role: "crew" | "flight_surgeon", environment: UserRow["environment"]) =>
    db
      .insert(s.users)
      .values({ crewId, displayName: crewId, role, title: "", profileId: null, pinHash: "x", environment, createdAt: now })
      .returning()
      .get();
  a = user("CS-101", "crew", "iss");
  b = user("CS-102", "crew", null);
  fs1 = user("FS-101", "flight_surgeon", null);

  const entry = (userId: number) => ({ userId, enteredBy: userId, source: "manual" as const, createdAt: now });
  db.insert(s.vitalsEntry).values({ ...entry(a.id), recordedAt: now, heartRate: 72, systolic: 150, diastolic: 95, spo2: 98, glucose: null }).run();
  db.insert(s.vitalsEntry).values({ ...entry(b.id), recordedAt: now, heartRate: 64, systolic: 116, diastolic: 74, spo2: 98, glucose: null }).run();
  db.insert(s.doseEntry).values([
    { ...entry(a.id), recordedAt: "2025-01-01T00:00:00.000Z", doseMsv: 118, periodHours: 4320, environment: "iss", note: null },
    { ...entry(a.id), recordedAt: now, doseMsv: 0.7, periodHours: 24, environment: "iss", note: null },
  ]).run();
  db.insert(s.sleepEntry)
    .values(
      demoNightlySeries("lindqvist", today).map((n) => ({
        ...entry(b.id),
        recordedAt: `${n.night}T22:00:00.000Z`,
        night: n.night,
        sleepHours: n.sleepHours,
        hrvRmssd: n.hrvMs,
        quality: n.quality,
        stress: n.stress,
      })),
    )
    .run();

  data = await import("./copilot-data");
  agent = await import("./agent");
  tools = await import("./tools");
});

afterAll(() => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // The SQLite handle may still be open on Windows; the OS cleans temp files.
  }
});

const crew = (u: UserRow): CopilotContext => ({ viewer: u, subject: u });

describe("data isolation", () => {
  it("no tool accepts a crew ID: the model can't choose whose data to read", () => {
    const t = tools.buildCopilotTools(crew(a));
    for (const [name, def] of Object.entries(t)) {
      const keys = Object.keys((def.inputSchema as unknown as { shape: Record<string, unknown> }).shape);
      for (const k of keys) expect(["days", "indicator", "ruleId"], `${name}.${k}`).toContain(k);
    }
  });

  it("each crew member's tools return only their own data", () => {
    const va = data.getLatestVitals(crew(a)).data;
    const vb = data.getLatestVitals(crew(b)).data;
    expect(JSON.stringify(va)).toContain("150/95");
    expect(JSON.stringify(vb)).not.toContain("150/95");

    const ra = data.getRadiationStatus(crew(a)).data;
    const rb = data.getRadiationStatus(crew(b)).data;
    expect(ra).toMatchObject({ careerTotalMsv: 118.7 });
    expect(rb).toMatchObject({ careerTotalMsv: 0 });

    const alertsA = data.getActiveAlerts(crew(a)).data.alerts.map((x) => x.ruleId);
    const alertsB = data.getActiveAlerts(crew(b)).data.alerts.map((x) => x.ruleId);
    expect(alertsA).toEqual(["vitals"]);
    expect(alertsB).toEqual(["hrv_sleep_decline", "sleep_night"]);
  });

  it("a flight surgeon with nobody selected gets no crew data; with a selection, only that crew member", () => {
    const none = { viewer: fs1, subject: null };
    expect(data.getLatestVitals(none).data).toMatchObject({ available: false });
    expect(data.getRadiationStatus(none).data).toMatchObject({ available: false });
    expect(data.getActiveAlerts(none).data.alerts).toEqual([]);
    const viewingB = { viewer: fs1, subject: b };
    expect(JSON.stringify(data.getLatestVitals(viewingB).data)).not.toContain("150/95");
  });

  it("every tool result carries a source", async () => {
    const ctx = crew(a);
    const results = [
      data.getLatestVitals(ctx),
      data.getSleepHistory(ctx, 7),
      data.getRadiationStatus(ctx),
      await data.getSpaceWeather(),
      data.getEnvironment(ctx),
      data.getActiveAlerts(ctx),
      data.getReferenceBaseline("glucose"),
      data.getGuidance(ctx, "hrv_sleep_decline"),
    ];
    for (const r of results) {
      expect(r.source.label.length).toBeGreaterThan(0);
      expect(r.source.citation.length).toBeGreaterThan(0);
    }
    expect(data.getReferenceBaseline("glucose").source.label).toBe("NASA OSDR OSD-575");
  });
});

describe("offline agent (mock model through the real AI SDK tool loop)", () => {
  it("why am I seeing this warning? → hrv_sleep_decline with the HRV % drop, and asks for an environment", async () => {
    const run = await agent.runCopilot(crew(b), [{ role: "user", content: "Why am I seeing this warning?" }], "Why am I seeing this warning?");
    expect(run.mode).toBe("mock");
    expect(run.tools.map((t) => t.toolName)).toEqual(["get_active_alerts", "get_guidance", "get_guidance", "get_environment"]);
    expect(run.text).toContain("hrv_sleep_decline");
    expect(run.text).toMatch(/HRV \(RMSSD\) was \d+(\.\d)?% below your own baseline/);
    expect(run.text).toContain("top bar");
    expect(run.blocked).toBe(false);
    expect(run.ungroundedNumbers).toEqual([]);
    expect(run.steps).toBeLessThanOrEqual(agent.MAX_STEPS);
  });

  it("radiation → career total against 600 mSv and the ISS projection", async () => {
    const run = await agent.runCopilot(crew(a), [{ role: "user", content: "What's my radiation status?" }], "What's my radiation status?");
    expect(run.text).toContain("Your career dose is 118.7 mSv");
    expect(run.text).toContain("600 mSv");
    expect(run.text).toContain("on ISS");
    expect(run.ungroundedNumbers).toEqual([]);
  });
});
