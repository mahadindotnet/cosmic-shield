"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeCrew, requireUser } from "@/lib/auth/dal";
import { utcToday } from "@/lib/vitals/data";
import { insertSleep } from "./data";
import { evaluateSleep, type SleepStatus } from "./rules";
import { sleepInput, type SleepField } from "./schema";

export interface LogSleepState {
  ok?: boolean;
  status?: SleepStatus;
  reasons?: string[];
  /** The night that was saved (YYYY-MM-DD). */
  night?: string;
  error?: string;
  fieldErrors?: Partial<Record<SleepField, string>>;
  values?: Partial<Record<SleepField, string>>;
  savedAt?: number;
}

const FIELDS: SleepField[] = ["night", "sleepHours", "quality", "hrvRmssd", "stress"];

/**
 * Saves one night for the signed-in crew member. A second entry for the same
 * night replaces the first in trends and in the early-warning rule (both are
 * kept in history). Flight surgeons are view-only.
 */
export async function logSleepAction(_prev: LogSleepState, formData: FormData): Promise<LogSleepState> {
  const current = await requireUser();
  const crew = activeCrew(current);
  if (!crew) return { error: "Flight surgeons can view crew data but not enter it." };

  const raw = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const parsed = sleepInput(utcToday()).safeParse(raw);
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors as Partial<Record<SleepField, string[]>>;
    return {
      error: "Check the highlighted fields.",
      fieldErrors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v?.[0]])),
      values: raw,
    };
  }

  insertSleep(crew.id, parsed.data, current.user.id);
  revalidatePath("/dashboard/sleep-stress");
  revalidatePath("/dashboard");

  const e = evaluateSleep(parsed.data);
  return { ok: true, status: e.status, reasons: e.reasons, night: parsed.data.night, savedAt: Date.now() };
}
