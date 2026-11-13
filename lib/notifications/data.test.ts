/** Notifications and read state against a real (temporary) SQLite database. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { UserRow } from "@/lib/auth/users";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-notif-"));
const url = `file:${path.join(dir, "notif.db")}`;
process.env.DATABASE_URL = url;
delete process.env.NASA_API_KEY; // cached DONKI (no event in the last 24 h)

let n: typeof import("./data");
let a: UserRow;
let b: UserRow;
let fsu: UserRow;

beforeAll(async () => {
  const { runMigrations } = await import("@/scripts/migrate");
  runMigrations(url);
  const { db } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const now = new Date().toISOString();
  const user = (crewId: string, role: "crew" | "flight_surgeon") =>
    db.insert(s.users).values({ crewId, displayName: crewId, role, title: "", profileId: null, pinHash: "x", createdAt: now }).returning().get();
  a = user("CS-301", "crew");
  b = user("CS-302", "crew");
  fsu = user("FS-301", "flight_surgeon");
  const entry = (u: UserRow) => ({ userId: u.id, enteredBy: u.id, source: "manual" as const, createdAt: now, recordedAt: now });
  db.insert(s.vitalsEntry).values({ ...entry(b), heartRate: 66, systolic: 118, diastolic: 74, spo2: 88, glucose: null }).run();
  db.insert(s.escalation)
    .values({ userId: b.id, crewId: "CS-302", ruleId: "vitals", entryTable: "vitals_entry", entryId: 1, reason: "SpO₂", evidenceJson: "{}", createdAt: now })
    .run();
  n = await import("./data");
});

afterAll(() => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // SQLite may still hold the file on Windows.
  }
});

describe("notificationsFor", () => {
  it("crew: due tasks and their own alerts only; cached DONKI without a recent event adds nothing", async () => {
    const na = await n.notificationsFor(a);
    expect(na.items.map((i) => i.key.split(":")[0])).toEqual(["checkin-due", "vitals-due"]);
    const nb = await n.notificationsFor(b);
    expect(nb.items.map((i) => i.key.split(":")[0])).toEqual(["alert", "checkin-due"]); // vitals logged today
    expect(nb.items[0]).toMatchObject({ kind: "alert", level: "escalate", href: "/dashboard/vitals" });
    expect(nb.items.some((i) => i.kind === "space_weather")).toBe(false);
  });

  it("read state is per user", async () => {
    const key = (await n.notificationsFor(a)).items[0].key;
    n.markRead(a.id, [key]);
    n.markRead(a.id, [key]); // idempotent
    const na = await n.notificationsFor(a);
    expect(na.unread).toBe(1);
    expect(na.items.find((i) => i.key === key)?.read).toBe(true);
    // b has the same check-in-due key (same day) but hasn't read it.
    expect((await n.notificationsFor(b)).items.find((i) => i.key === key)?.read).toBe(false);
  });

  it("flight surgeon: new escalations for crew, not crew tasks", async () => {
    const f = await n.notificationsFor(fsu);
    expect(f.items).toHaveLength(1);
    expect(f.items[0]).toMatchObject({ kind: "escalation", title: "New escalation: CS-302", href: "/dashboard/admin?crew=CS-302" });
  });

  it("Choose later on the environment dialog is per login session", () => {
    expect(n.envPromptDismissed(a.id, 1000)).toBe(false);
    n.dismissEnvPrompt(a.id, 1000);
    expect(n.envPromptDismissed(a.id, 1000)).toBe(true);
    expect(n.envPromptDismissed(a.id, 2000)).toBe(false); // next login
    expect(n.envPromptDismissed(b.id, 1000)).toBe(false);
  });
});
