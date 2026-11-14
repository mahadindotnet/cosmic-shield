import { z } from "zod";
import { EYE_LIMITS, isCell } from "./rules";

const blank = (v: unknown) => v === "" || v === null || v === undefined;
const note = z.preprocess((v) => (blank(v) ? null : String(v).trim() || null), z.string().max(200, "Keep the note under 200 characters.").nullable());
const eye = z.enum(["left", "right"], { error: "Choose the eye." });

/** One Amsler test of one eye: the marked cells (JSON), whether the centre dot was seen, a note. */
export const amslerInput = z.object({
  eye,
  marks: z.preprocess(
    (v) => {
      if (blank(v)) return [];
      try {
        return JSON.parse(String(v));
      } catch {
        return null;
      }
    },
    z
      .array(z.unknown(), { error: "The marked cells couldn't be read." })
      .max(EYE_LIMITS.gridSize * EYE_LIMITS.gridSize, "The marked cells couldn't be read.")
      .refine((a) => a.every(isCell), "The marked cells couldn't be read.")
      .transform((a) => {
        // Unique cells, sorted (row, then column).
        const keys = [...new Set((a as [number, number][]).map(([r, c]) => r * 100 + c))].sort((x, y) => x - y);
        return keys.map((k) => [Math.floor(k / 100), k % 100] as [number, number]);
      }),
  ),
  centreVisible: z.preprocess((v) => v !== "no", z.boolean()),
  note,
});

/** One fundus photo of one eye (the photo itself is checked by lib/uploads/photos.ts). */
export const fundusInput = z.object({
  eye,
  groundReview: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  note,
});

export type AmslerInput = { eye: "left" | "right"; marks: [number, number][]; centreVisible: boolean; note: string | null };
export type FundusInput = { eye: "left" | "right"; groundReview: boolean; note: string | null };
