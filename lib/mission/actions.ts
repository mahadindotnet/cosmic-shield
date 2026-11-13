"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MISSION_ENVIRONMENTS } from "@/lib/mission/environments";

const EnvironmentId = z.enum(MISSION_ENVIRONMENTS.map((m) => m.id) as [string, ...string[]]);

/** Saves the signed-in user's mission environment to their account. */
export async function saveEnvironmentAction(id: string): Promise<{ ok: boolean }> {
  const { user } = await requireUser();
  const parsed = EnvironmentId.safeParse(id);
  if (!parsed.success) return { ok: false };
  db.update(users)
    .set({ environment: parsed.data as (typeof users.$inferSelect)["environment"] })
    .where(eq(users.id, user.id))
    .run();
  return { ok: true };
}
