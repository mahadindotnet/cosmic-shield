"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { dismissEnvPrompt, markRead, notificationsFor } from "./data";

/**
 * Marks notifications read. Only keys of the user's own current items are
 * accepted, so nothing arbitrary is stored.
 */
export async function markNotificationsReadAction(keys: string[] | "all"): Promise<{ ok: boolean }> {
  const { user } = await requireUser();
  const current = (await notificationsFor(user)).items.map((i) => i.key);
  const allowed = new Set(current);
  const toMark = keys === "all" ? current : (Array.isArray(keys) ? keys : []).filter((k) => typeof k === "string" && allowed.has(k));
  markRead(user.id, toMark);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** "Choose later" on the environment dialog: hidden for the rest of this login session. */
export async function dismissEnvironmentPromptAction(): Promise<{ ok: boolean }> {
  const { user, session } = await requireUser();
  dismissEnvPrompt(user.id, session.issuedAt);
  return { ok: true };
}
