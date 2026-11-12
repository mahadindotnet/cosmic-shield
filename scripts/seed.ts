import { db } from "@/lib/db";
import { crew, vitalReading, checkIn, escalationEvent, loginAudit, users } from "@/lib/db/schema";
import { assertAuthEnv } from "@/lib/auth/config";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";
import { hashPin } from "@/lib/auth/pin";
import { getAllCrewDashboards } from "@/lib/demo/crew-profiles";

async function main() {
  // Fails with a clear message if PIN_PEPPER / SESSION_SECRET are missing.
  assertAuthEnv();

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

  console.log("Seed complete:", Object.keys(dashboards).length, "crew,", DEMO_ACCOUNTS.length, "login accounts");
}

main().catch((err) => {
  // Message only: never print stack data that could include secrets.
  console.error(err instanceof Error ? err.message : "Seed failed");
  process.exit(1);
});
