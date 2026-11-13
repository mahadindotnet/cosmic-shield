"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { utcToday } from "@/lib/alerts/data";
import { activeCrew, requireUser } from "@/lib/auth/dal";
import { removeStoredPhoto, savePhoto } from "@/lib/uploads/photos";
import { classifyBristolPhoto, PHOTO_NOT_ANALYSED_LABEL } from "./classifier";
import { insertGi } from "./data";
import { giInput, type GiField, type GiInput } from "./schema";

export interface LogGiState {
  ok?: boolean;
  bristolType?: number;
  /** "Not analysed: prototype" when a photo was stored. */
  photoLabel?: string;
  error?: string;
  fieldErrors?: Partial<Record<GiField, string>>;
  values?: Partial<Record<Exclude<GiField, "photo">, string>>;
  savedAt?: number;
}

const FIELDS = ["day", "bristolType", "hydrationLiters", "note"] as const;

/**
 * Saves one GI entry for the signed-in crew member, with an optional photo.
 * The photo is a labelled prototype: it is stored (metadata removed) but not
 * analysed; the Bristol type the crew member chose is what gets logged.
 * Flight surgeons are view-only.
 */
export async function logGiAction(_prev: LogGiState, formData: FormData): Promise<LogGiState> {
  const current = await requireUser();
  const crew = activeCrew(current);
  if (!crew) return { error: "Flight surgeons can view crew data but not enter it." };

  const raw = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const parsed = giInput(utcToday()).safeParse(raw);
  const file = formData.get("photo");
  const photo = file instanceof File && file.size > 0 ? file : null;

  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors as Partial<Record<GiField, string[]>>;
    return {
      error: "Check the highlighted fields.",
      fieldErrors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v?.[0]])),
      values: raw,
    };
  }

  let stored: { path: string; analysis: string } | null = null;
  if (photo) {
    const saved = await savePhoto("gi", crew.id, photo);
    if (!saved.ok) return { error: "Check the highlighted fields.", fieldErrors: { photo: saved.error }, values: raw };
    stored = { path: saved.relPath, analysis: classifyBristolPhoto().status };
  }

  const input = parsed.data as GiInput;
  try {
    insertGi(crew, current.user.id, input, stored);
  } catch (e) {
    if (stored) await removeStoredPhoto(stored.path);
    throw e;
  }
  revalidatePath("/dashboard/gi");
  revalidatePath("/dashboard", "layout");
  return { ok: true, bristolType: input.bristolType, photoLabel: stored ? PHOTO_NOT_ANALYSED_LABEL : undefined, savedAt: Date.now() };
}
