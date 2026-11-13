"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeCrew, requireUser } from "@/lib/auth/dal";
import { recordVitals } from "./data";
import type { VitalsStatus } from "./rules";
import { VitalsInput, type VitalsField } from "./schema";

export interface LogVitalsState {
  ok?: boolean;
  /** Status of the saved reading (rules run on the saved values). */
  status?: VitalsStatus;
  reasons?: string[];
  /** Set when the reading raised an escalation record for the flight surgeon. */
  escalationId?: number | null;
  error?: string;
  fieldErrors?: Partial<Record<VitalsField, string>>;
  /** What was typed, so a rejected form keeps its values. */
  values?: Partial<Record<VitalsField, string>>;
  /** Changes on every save (resets the form). */
  savedAt?: number;
}

const FIELDS: VitalsField[] = ["heartRate", "spo2", "systolic", "diastolic", "glucose"];

/** Saves one set of vitals for the signed-in crew member. Flight surgeons are view-only. */
export async function logVitalsAction(_prev: LogVitalsState, formData: FormData): Promise<LogVitalsState> {
  const current = await requireUser();
  const crew = activeCrew(current);
  if (!crew) return { error: "Flight surgeons can view crew data but not enter it." };

  const raw = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const parsed = VitalsInput.safeParse(raw);
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors as Partial<Record<VitalsField, string[]>>;
    return {
      error: "Check the highlighted fields.",
      fieldErrors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v?.[0]])),
      values: raw,
    };
  }

  const { evaluation: e, escalationId } = recordVitals(crew, current.user.id, parsed.data);
  revalidatePath("/dashboard/vitals");
  revalidatePath("/dashboard");

  return { ok: true, status: e.status, reasons: e.reasons, escalationId, savedAt: Date.now() };
}
