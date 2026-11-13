import { db } from "@/lib/db";
import {
  alertAck,
  checkIn,
  checkin,
  countermeasureEntry,
  crew,
  doseEntry,
  escalation,
  escalationEvent,
  eyeScreening,
  giEntry,
  loginAudit,
  sleepEntry,
  users,
  vitalReading,
  vitalsEntry,
} from "@/lib/db/schema";
import { demoNightlySeries } from "@/lib/demo/nightly";
import { assertAuthEnv } from "@/lib/auth/config";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";
import { hashPin } from "@/lib/auth/pin";
import { getAllCrewDashboards } from "@/lib/demo/crew-profiles";
import { seedVitalsSeries } from "@/lib/vitals/seed-data";

async function main() {
  // Fails with a clear message if PIN_PEPPER / SESSION_SECRET are missing.
  assertAuthEnv();

  // Typed health entries (all rows, including manual ones: the seed resets the demo).
  for (const t of [vitalsEntry, sleepEntry, doseEntry, countermeasureEntry, giEntry, eyeScreening, checkin, escalation]) {
    await db.delete(t);
  }
  await db.delete(alertAck);
  await db.delete(loginAudit);
  await db.delete(users);
  await db.delete(escalationEvent);
  await db.delete(checkIn);
  await db.delete(vitalReading);
  await db.delete(crew);

  const dashboards = getAllCrewDashboards();

  for (const payload of Object.values(dashboards)) {
    await db.insert(crew).values({ id: payload.id, name: payload.name, role: payload.role });

    const now = new Date().toISOString();
    const v = payload.vitals;
    const metrics: { metric: string; value: number }[] = [
      { metric: "heart_rate", value: v.heartRateBpm },
      { metric: "hrv", value: v.hrvMs },
      { metric: "spo2", value: v.spo2Pct },
      { metric: "systolic_bp", value: v.systolicBp },
      { metric: "diastolic_bp", value: v.diastolicBp },
      { metric: "sleep_hours", value: v.sleepHours },
      { metric: "stress_index", value: v.stressIndex },
      { metric: "radiation_dose", value: v.radiationDoseMsvDay },
    ];

    for (const m of metrics) {
      await db.insert(vitalReading).values({
        crewId: payload.id,
        metric: m.metric,
        value: m.value,
        missionDay: payload.missionDay,
        recordedAt: now,
      });
    }

    for (const log of payload.behavioralLog) {
      await db.insert(checkIn).values({
        crewId: payload.id,
        affectScore: log.affectScore,
        note: log.note,
        recordedAt: log.at,
      });
    }

    await db.insert(escalationEvent).values({
      crewId: payload.id,
      level: payload.escalation.level,
      reason: payload.escalation.headline,
      evidenceJson: JSON.stringify(payload.escalation.evidence),
      recordedAt: now,
    });
  }

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

  console.log(
    "Seed complete:",
    Object.keys(dashboards).length,
    "crew,",
    DEMO_ACCOUNTS.length,
    "login accounts,",
    vitalsRows,
    "vitals entries,",
    sleepRows,
    "sleep entries",
  );
}

main().catch((err) => {
  // Message only: never print stack data that could include secrets.
  console.error(err instanceof Error ? err.message : "Seed failed");
  process.exit(1);
});
