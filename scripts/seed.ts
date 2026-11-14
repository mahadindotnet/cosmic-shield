import { rmSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import {
  alertAck,
  checkin,
  countermeasureEntry,
  doseEntry,
  escalation,
  eyeScreening,
  giEntry,
  loginAudit,
  notificationRead,
  sleepEntry,
  users,
  vitalsEntry,
} from "@/lib/db/schema";
import { demoNightlySeries } from "@/lib/demo/nightly";
import { assertAuthEnv } from "@/lib/auth/config";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";
import { hashPin } from "@/lib/auth/pin";
import { seedCheckinSeries } from "@/lib/mind/seed-data";
import { seedBoneSeries } from "@/lib/bone/seed-data";
import { seedGiSeries } from "@/lib/gi/seed-data";
import { seedDoseSeries } from "@/lib/radiation/seed-data";
import { seedVitalsSeries } from "@/lib/vitals/seed-data";

async function main() {
  // Fails with a clear message if PIN_PEPPER / SESSION_SECRET are missing.
  assertAuthEnv();

  // Typed health entries (all rows, including manual ones: the seed resets the demo).
  for (const t of [vitalsEntry, sleepEntry, doseEntry, countermeasureEntry, giEntry, eyeScreening, checkin, escalation]) {
    await db.delete(t);
  }
  // Their photos too (same folder as lib/uploads/photos.ts: UPLOADS_DIR, default ./uploads).
  const uploads = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
  for (const kind of ["gi", "eye"]) rmSync(path.join(uploads, kind), { recursive: true, force: true });
  await db.delete(alertAck);
  await db.delete(notificationRead);
  await db.delete(loginAudit);
  await db.delete(users);

  // Login accounts: demo PINs, hashed with the pepper. Demo accounts never
  // force a PIN change, so the README credentials keep working.
  const createdAt = new Date().toISOString();
  for (const a of DEMO_ACCOUNTS) {
    await db.insert(users).values({
      crewId: a.crewId,
      displayName: a.displayName,
      title: a.title,
      role: a.role,
      profileId: a.profileId,
      pinHash: await hashPin(a.pin),
      failedAttempts: 0,
      lockedUntil: null,
      mustChangePin: false,
      createdAt,
    });
  }

  // 14 days of morning vitals per crew member, ending yesterday (UTC), so
  // today is free for a real entry. Deterministic, all inside the Normal band.
  const today = new Date().toISOString().slice(0, 10);
  const crewUsers = db.select().from(users).all().filter((u) => u.role === "crew").sort((a, b) => a.crewId.localeCompare(b.crewId));
  let vitalsRows = 0;
  crewUsers.forEach((u, i) => {
    const rows = seedVitalsSeries(i, today).map(({ recordedAt, ...v }) => ({
      ...v,
      userId: u.id,
      enteredBy: u.id,
      source: "seed" as const,
      recordedAt,
      createdAt: createdAt,
    }));
    db.insert(vitalsEntry).values(rows).run();
    vitalsRows += rows.length;
  });

  // 14 nights of sleep, HRV (RMSSD), quality and stress per crew member,
  // ending last night (UTC). Only CS-003 shows the early-warning pattern.
  let sleepRows = 0;
  for (const u of crewUsers) {
    const nights = u.profileId ? demoNightlySeries(u.profileId, today) : [];
    if (!nights.length) continue;
    db.insert(sleepEntry)
      .values(
        nights.map((n) => ({
          userId: u.id,
          enteredBy: u.id,
          source: "seed" as const,
          recordedAt: `${n.night}T22:00:00.000Z`,
          createdAt,
          night: n.night,
          sleepHours: n.sleepHours,
          hrvRmssd: n.hrvMs,
          quality: n.quality,
          stress: n.stress,
        })),
      )
      .run();
    sleepRows += nights.length;
  }

  // 14 daily dosimeter readings per crew member at the ISS dose (ALTEA via
  // NASA RadLab, ±8 %), ending yesterday, plus a career summary entry for
  // anyone who has flown before. Everyone stays below every Watch level.
  let doseRows = 0;
  crewUsers.forEach((u, i) => {
    const rows = seedDoseSeries(i, today).map((d) => ({ ...d, userId: u.id, enteredBy: u.id, source: "seed" as const, createdAt }));
    db.insert(doseEntry).values(rows).run();
    doseRows += rows.length;
  });

  // 14 evening check-ins per crew member (1–5 scales), ending yesterday, so
  // today's check-in (and the streak) is still open. Never raises a status.
  let checkinRows = 0;
  crewUsers.forEach((u, i) => {
    const rows = seedCheckinSeries(i, today).map((c) => ({ ...c, userId: u.id, enteredBy: u.id, source: "seed" as const, createdAt }));
    db.insert(checkin).values(rows).run();
    checkinRows += rows.length;
  });

  // 14 days of bone protection logs (exercise + calcium / vitamin D), ending yesterday.
  let boneRows = 0;
  crewUsers.forEach((u, i) => {
    const rows = seedBoneSeries(i, today).map((b) => ({ ...b, userId: u.id, enteredBy: u.id, source: "seed" as const, createdAt }));
    db.insert(countermeasureEntry).values(rows).run();
    boneRows += rows.length;
  });

  // 14 days of GI entries (Bristol types 3–5, 2.2–2.8 L of fluid), ending yesterday. No photos.
  let giRows = 0;
  crewUsers.forEach((u, i) => {
    const rows = seedGiSeries(i, today).map((g) => ({ ...g, userId: u.id, enteredBy: u.id, source: "seed" as const, createdAt }));
    db.insert(giEntry).values(rows).run();
    giRows += rows.length;
  });

  console.log(
    "Seed complete:",
    DEMO_ACCOUNTS.length,
    "login accounts,",
    vitalsRows,
    "vitals entries,",
    sleepRows,
    "sleep entries,",
    doseRows,
    "dose entries,",
    checkinRows,
    "check-ins,",
    boneRows,
    "bone logs,",
    giRows,
    "GI entries",
  );
}

main().catch((err) => {
  // Message only: never print stack data that could include secrets.
  console.error(err instanceof Error ? err.message : "Seed failed");
  process.exit(1);
});
