/**
 * Eye screenings and their escalation records against a real (temporary)
 * SQLite database.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { UserRow } from "@/lib/auth/users";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-eyes-"));
const url = `file:${path.join(dir, "eyes.db")}`;
process.env.DATABASE_URL = url;

let eyes: typeof import("./data");
let alerts: typeof import("@/lib/alerts/active");
let a: UserRow;
let escalations: () => { ruleId: string; reason: string; entryTable: string; entryId: number; evidenceJson: string }[];

beforeAll(async () => {
  const { runMigrations } = await import("@/scripts/migrate");
  runMigrations(url);
  const { db } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const now = new Date().toISOString();
  a = db.insert(s.users).values({ crewId: "CS-301", displayName: "CS-301", role: "crew", title: "", profileId: null, pinHash: "x", environment: "iss", createdAt: now }).returning().get();
  eyes = await import("./data");
  alerts = await import("@/lib/alerts/active");
  escalations = () => db.select().from(s.escalation).all();
});

afterAll(() => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* the open database handle can keep the file on Windows */
  }
});

describe("Amsler tests", () => {
  it("a normal test: no alert, no escalation", () => {
    const r = eyes.insertAmsler(a, a.id, { eye: "left", marks: [], centreVisible: true, note: null });
    expect(r).toMatchObject({ changed: false, escalationId: null });
    expect(alerts.activeAlertsFor(a.id).alerts.find((x) => x.ruleId === "eye_amsler")).toBeUndefined();
  });

  it("one changed test: Watch alert, no escalation yet", () => {
    const r = eyes.insertAmsler(a, a.id, { eye: "left", marks: [[9, 9], [9, 10]], centreVisible: true, note: "bent lines" });
    expect(r).toMatchObject({ changed: true, escalationId: null });
    const alert = alerts.activeAlertsFor(a.id).alerts.find((x) => x.ruleId === "eye_amsler");
    expect(alert).toMatchObject({ level: "watch", href: "/dashboard/eyes" });
    expect(alert?.detail).toContain("Vision change noticed: repeat the test tomorrow and tell your CMO.");
    expect(escalations()).toHaveLength(0);
    // The other eye's test doesn't count toward this eye's run.
    expect(eyes.insertAmsler(a, a.id, { eye: "right", marks: [[1, 1]], centreVisible: true, note: null }).escalationId).toBeNull();
  });

  it("the second changed test in a row of the same eye creates one escalation record (Watch level)", () => {
    const r = eyes.insertAmsler(a, a.id, { eye: "left", marks: [], centreVisible: false, note: null });
    expect(r.escalationId).not.toBeNull();
    const [e] = escalations();
    expect(e).toMatchObject({ ruleId: "eye_amsler_repeat", entryTable: "eye_screening", entryId: r.entryId });
    expect(e.reason).toBe("Vision change noticed on 2 Amsler tests in a row (left eye): 2 cells marked, then centre dot not seen. Watch level, not a diagnosis.");
    expect(JSON.parse(e.evidenceJson)).toMatchObject({ level: "watch", eye: "left" });
    // A third changed test doesn't add another record; a normal test then ends the run.
    expect(eyes.insertAmsler(a, a.id, { eye: "left", marks: [[2, 2]], centreVisible: true, note: null }).escalationId).toBeNull();
    eyes.insertAmsler(a, a.id, { eye: "left", marks: [], centreVisible: true, note: null });
    eyes.insertAmsler(a, a.id, { eye: "right", marks: [], centreVisible: true, note: null });
    expect(escalations()).toHaveLength(1);
    expect(alerts.activeAlertsFor(a.id).alerts.find((x) => x.ruleId === "eye_amsler")).toBeUndefined();
  });
});

describe("fundus photos", () => {
  it("flag for ground review creates an escalation record pointing at the photo entry", () => {
    const plain = eyes.insertFundus(a, a.id, { eye: "right", groundReview: false, note: null }, { path: "eye/1/a.jpg", analysis: "not_analysed" });
    expect(plain.escalationId).toBeNull();
    const flagged = eyes.insertFundus(a, a.id, { eye: "left", groundReview: true, note: null }, { path: "eye/1/b.jpg", analysis: "not_analysed" });
    const e = escalations().find((x) => x.ruleId === "eye_ground_review")!;
    expect(e).toMatchObject({ entryTable: "eye_screening", entryId: flagged.entryId });
    expect(e.reason).toContain("Not analysed: prototype. Watch level, not a diagnosis.");
    expect(eyes.eyePhotoRow(flagged.entryId)).toEqual({ userId: a.id, photoPath: "eye/1/b.jpg" });
    const s = eyes.eyeSummaryFor(a.id);
    expect(s.lastFundus).toMatchObject({ id: flagged.entryId, groundReview: true, hasPhoto: true });
    expect(JSON.stringify(s)).not.toContain("eye/1/b.jpg");
  });
});
