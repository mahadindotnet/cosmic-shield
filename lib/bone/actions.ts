"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { utcToday } from "@/lib/alerts/data";
import { activeCrew, requireUser } from "@/lib/auth/dal";
import { insertBone } from "./data";
import { boneInput, type BoneField, type BoneInput } from "./schema";

export interface LogBoneState {
  ok?: boolean;
  /** Exercise minutes in the saved entry. */
  minutes?: number;
  day?: string;
  error?: string;
  fieldErrors?: Partial<Record<BoneField, string>>;
  values?: Partial<Record<BoneField, string>>;
  savedAt?: number;
}

const FIELDS: BoneField[] = ["day", "aerobicMinutes", "resistanceMinutes", "loadKg", "reps", "calciumMg", "vitaminDIu", "note"];

/** Saves one bone protection log for the signed-in crew member. Flight surgeons are view-only. */
export async function logBoneAction(_prev: LogBoneState, formData: FormData): Promise<LogBoneState> {
  const current = await requireUser();
  const crew = activeCrew(current);
  if (!crew) return { error: "Flight surgeons can view crew data but not enter it." };

  const raw = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const parsed = boneInput(utcToday()).safeParse(raw);
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors as Partial<Record<BoneField, string[]>>;
    return {
      error: "Check the highlighted fields.",
      fieldErrors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v?.[0]])),
      values: raw,
    };
  }
  const input = parsed.data as BoneInput;
  insertBone(crew, current.user.id, input);
  revalidatePath("/dashboard/bone");
  revalidatePath("/dashboard", "layout");
  return { ok: true, minutes: (input.aerobicMinutes ?? 0) + (input.resistanceMinutes ?? 0), day: input.day, savedAt: Date.now() };
}
