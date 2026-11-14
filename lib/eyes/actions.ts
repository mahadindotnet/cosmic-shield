"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeCrew, requireUser } from "@/lib/auth/dal";
import { removeStoredPhoto, savePhoto } from "@/lib/uploads/photos";
import { classifyFundusPhoto, PHOTO_NOT_ANALYSED_LABEL } from "./classifier";
import { insertAmsler, insertFundus } from "./data";
import { amslerInput, fundusInput, type AmslerInput, type FundusInput } from "./schema";

export interface SaveAmslerState {
  ok?: boolean;
  eye?: "left" | "right";
  changed?: boolean;
  markedCells?: number;
  /** An escalation record was created (changes on 2 tests in a row). */
  surgeonTold?: boolean;
  error?: string;
  savedAt?: number;
}

export interface SaveFundusState {
  ok?: boolean;
  eye?: "left" | "right";
  photoLabel?: string;
  flagged?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"eye" | "photo" | "note", string>>;
  values?: { eye?: string; note?: string; groundReview?: string };
  savedAt?: number;
}

const firstErrors = (error: z.ZodError) =>
  Object.fromEntries(Object.entries(z.flattenError(error).fieldErrors as Record<string, string[] | undefined>).map(([k, v]) => [k, v?.[0]]));

const done = () => {
  revalidatePath("/dashboard/eyes");
  revalidatePath("/dashboard", "layout");
};

/** Saves one Amsler test of one eye for the signed-in crew member. Flight surgeons are view-only. */
export async function saveAmslerAction(_prev: SaveAmslerState, formData: FormData): Promise<SaveAmslerState> {
  const current = await requireUser();
  const crew = activeCrew(current);
  if (!crew) return { error: "Flight surgeons can view crew data but not enter it." };
  const parsed = amslerInput.safeParse({
    eye: formData.get("eye") ?? "",
    marks: formData.get("marks") ?? "",
    centreVisible: formData.get("centreVisible") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: Object.values(firstErrors(parsed.error)).find(Boolean) ?? "Check the test and try again." };
  const input = parsed.data as AmslerInput;
  const saved = insertAmsler(crew, current.user.id, input);
  done();
  return { ok: true, eye: input.eye, changed: saved.changed, markedCells: input.marks.length, surgeonTold: saved.escalationId !== null, savedAt: Date.now() };
}

/**
 * Saves one fundus photo (prototype: stored with metadata removed, never
 * analysed). "Flag for ground review" creates an escalation record.
 */
export async function saveFundusAction(_prev: SaveFundusState, formData: FormData): Promise<SaveFundusState> {
  const current = await requireUser();
  const crew = activeCrew(current);
  if (!crew) return { error: "Flight surgeons can view crew data but not enter it." };
  const values = { eye: String(formData.get("eye") ?? ""), note: String(formData.get("note") ?? ""), groundReview: String(formData.get("groundReview") ?? "") };
  const parsed = fundusInput.safeParse(values);
  const file = formData.get("photo");
  const photo = file instanceof File && file.size > 0 ? file : null;

  const fieldErrors: SaveFundusState["fieldErrors"] = parsed.success ? {} : firstErrors(parsed.error);
  if (!photo) fieldErrors.photo = "Choose a fundus photo (JPEG, PNG or WebP).";
  if (!parsed.success || !photo) return { error: "Check the highlighted fields.", fieldErrors, values };

  const saved = await savePhoto("eye", crew.id, photo);
  if (!saved.ok) return { error: "Check the highlighted fields.", fieldErrors: { photo: saved.error }, values };
  const input = parsed.data as FundusInput;
  try {
    insertFundus(crew, current.user.id, input, { path: saved.relPath, analysis: classifyFundusPhoto().status });
  } catch (e) {
    await removeStoredPhoto(saved.relPath);
    throw e;
  }
  done();
  return { ok: true, eye: input.eye, photoLabel: PHOTO_NOT_ANALYSED_LABEL, flagged: input.groundReview, savedAt: Date.now() };
}
