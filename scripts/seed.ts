import { db } from "@/lib/db";
import { crew, vitalReading, checkIn, escalationEvent } from "@/lib/db/schema";
import { getAllCrewDashboards } from "@/lib/demo/crew-profiles";

async function main() {
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

  console.log("Seed complete:", Object.keys(dashboards).length, "crew");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
