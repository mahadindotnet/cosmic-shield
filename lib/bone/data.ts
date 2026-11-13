import "server-only";
import { desc, eq } from "drizzle-orm";
import { utcToday } from "@/lib/alerts/data";
import type { UserRow } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { countermeasureEntry } from "@/lib/db/schema";
import { dailyExerciseTarget, sessionKind } from "./rules";
import type { BoneInput } from "./schema";
import { summarizeBone, type BoneRow, type BoneSummary } from "./summary";

const ROW_LIMIT = 300;

export function insertBone(crew: Pick<UserRow, "id">, enteredBy: number, input: BoneInput) {
  const now = new Date();
  const aerobic = input.aerobicMinutes ?? 0;
  const resistance = input.resistanceMinutes ?? 0;
  return db
    .insert(countermeasureEntry)
    .values({
      userId: crew.id,
      enteredBy,
      source: "manual",
      // Today: now; an earlier day: midday UTC of that day.
      recordedAt: input.day === now.toISOString().slice(0, 10) ? now.toISOString() : `${input.day}T12:00:00.000Z`,
      createdAt: now.toISOString(),
      kind: sessionKind({ aerobicMinutes: aerobic, resistanceMinutes: resistance, loadKg: input.loadKg }),
      minutes: aerobic + resistance,
      aerobicMinutes: input.aerobicMinutes,
      resistanceMinutes: input.resistanceMinutes,
      loadKg: input.loadKg,
      reps: input.reps,
      calciumMg: input.calciumMg,
      vitaminDIu: input.vitaminDIu,
      note: input.note,
    })
    .run();
}

/** One user's bone logs, newest first. Callers must have checked access to `userId`. */
export function boneRowsFor(userId: number): BoneRow[] {
  return db
    .select({
      id: countermeasureEntry.id,
      recordedAt: countermeasureEntry.recordedAt,
      source: countermeasureEntry.source,
      aerobicMinutes: countermeasureEntry.aerobicMinutes,
      resistanceMinutes: countermeasureEntry.resistanceMinutes,
      minutes: countermeasureEntry.minutes,
      loadKg: countermeasureEntry.loadKg,
      reps: countermeasureEntry.reps,
      calciumMg: countermeasureEntry.calciumMg,
      vitaminDIu: countermeasureEntry.vitaminDIu,
      note: countermeasureEntry.note,
    })
    .from(countermeasureEntry)
    .where(eq(countermeasureEntry.userId, userId))
    .orderBy(desc(countermeasureEntry.recordedAt), desc(countermeasureEntry.id))
    .limit(ROW_LIMIT)
    .all();
}

/** Against the user's environment's daily exercise target (app default). */
export function boneSummaryFor(user: Pick<UserRow, "id" | "environment">, days = 14): BoneSummary {
  return summarizeBone(boneRowsFor(user.id), utcToday(), dailyExerciseTarget(user.environment).minutes, days);
}
