"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeCrew, requireUser } from "@/lib/auth/dal";
import { utcToday } from "@/lib/vitals/data";
import { recordDose } from "./data";
import type { CareerStatus, DoseStatus } from "./rules";
import { doseInput, type DoseField } from "./schema";

export interface LogDoseState {
  ok?: boolean;
  /** The reading's daily-rate status. */
  status?: DoseStatus;
  rate?: number;
  reasons?: string[];
  careerStatus?: CareerStatus;
  careerTotalMsv?: number;
  escalationId?: number | null;
  error?: string;
  fieldErrors?: Partial<Record<DoseField, string>>;
  values?: Partial<Record<DoseField, string>>;
  savedAt?: number;
}

const FIELDS: DoseField[] = ["day", "doseMsv", "periodHours", "note"];

/** Saves one dosimeter reading for the signed-in crew member. Flight surgeons are view-only. */
export async function logDoseAction(_prev: LogDoseState, formData: FormData): Promise<LogDoseState> {
  const current = await requireUser();
  const crew = activeCrew(current);
  if (!crew) return { error: "Flight surgeons can view crew data but not enter it." };

  const raw = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const parsed = doseInput(utcToday()).safeParse(raw);
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors as Partial<Record<DoseField, string[]>>;
    return {
      error: "Check the highlighted fields.",
      fieldErrors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v?.[0]])),
      values: raw,
    };
  }

  const { dose, career, escalationId } = recordDose(crew, current.user.id, parsed.data);
  revalidatePath("/dashboard/radiation");
  revalidatePath("/dashboard");

  return {
    ok: true,
    status: dose.status,
    rate: dose.rate,
    reasons: [dose.reason, career.reason].filter((r): r is string => Boolean(r)),
    careerStatus: career.status,
    careerTotalMsv: career.totalMsv,
    escalationId,
    savedAt: Date.now(),
  };
}
