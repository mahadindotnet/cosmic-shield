import { z } from "zod";

const blank = (v: unknown) => v === "" || v === null || v === undefined;

export const MAX_GI_AGE_DAYS = 30;

/** One GI entry: a Bristol type (1–7, required), optional fluid intake and note. The photo is checked separately (lib/gi/photos.ts). */
export function giInput(today: string) {
  const oldest = new Date(`${today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - MAX_GI_AGE_DAYS);
  const oldestDay = oldest.toISOString().slice(0, 10);
  return z.object({
    day: z
      .string({ error: "Choose the day." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the day.")
      .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Choose the day.")
      .refine((d) => d <= today, "The day can't be in the future.")
      .refine((d) => d >= oldestDay, `Only the last ${MAX_GI_AGE_DAYS} days can be logged.`),
    bristolType: z.preprocess(
      (v) => (blank(v) ? undefined : Number(v)),
      z
        .number({ error: "Choose the Bristol type (1–7)." })
        .int("Choose the Bristol type (1–7).")
        .min(1, "Choose the Bristol type (1–7).")
        .max(7, "Choose the Bristol type (1–7)."),
    ),
    hydrationLiters: z.preprocess(
      (v) => (blank(v) ? null : Number(v)),
      z
        .number({ error: "Fluid intake must be a number." })
        .min(0, "Fluid intake can't be negative.")
        .max(10, "Fluid intake must be 10 L or less.")
        .nullable(),
    ),
    note: z.preprocess((v) => (blank(v) ? null : String(v).trim() || null), z.string().max(200, "Keep the note under 200 characters.").nullable()),
  });
}

export type GiInput = { day: string; bristolType: number; hydrationLiters: number | null; note: string | null };
export type GiField = keyof GiInput | "photo";
