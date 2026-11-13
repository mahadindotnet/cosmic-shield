"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { HRV_SLEEP_DECLINE_ID } from "@/lib/rules/hrv-sleep-decline";
import { acknowledge, isAcknowledged, utcToday } from "./data";

const KNOWN_RULES: ReadonlySet<string> = new Set([HRV_SLEEP_DECLINE_ID]);

/** "Dismiss for today": logs the acknowledgement and hides the alert until tomorrow (UTC). */
export async function dismissAlertAction(
  ruleId: string,
): Promise<{ ok: boolean }> {
  const { user } = await requireUser();
  if (!KNOWN_RULES.has(ruleId)) return { ok: false };
  const day = utcToday();
  if (!isAcknowledged(user.id, ruleId, day))
    acknowledge(user.id, user.crewId, ruleId, day);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
