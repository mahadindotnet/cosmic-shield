import { z } from "zod";

const blank = (v: unknown) => v === "" || v === null || v === undefined;

/** Oldest day that can be logged, in days before today. */
export const MAX_DOSE_AGE_DAYS = 30;

/**
 * One dosimeter reading, validated against `today` (YYYY-MM-DD, UTC). `day` is
 * the UTC date the reading was taken. Ranges reject typos, not high doses.
 */
export function doseInput(today: string) {
  const oldest = new Date(`${today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - MAX_DOSE_AGE_DAYS);
  const oldestDay = oldest.toISOString().slice(0, 10);
  const number = (label: string, min: number, max: number) =>
    z.preprocess(
      (v) => (blank(v) ? undefined : Number(v)),
      z
        .number({ error: (iss) => (iss.input === undefined ? `Enter the ${label}.` : `The ${label} must be a number.`) })
        .min(min, `The ${label} must be ${min}–${max}.`)
        .max(max, `The ${label} must be ${min}–${max}.`),
    );
  return z.object({
    day: z
      .string({ error: "Choose the day." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the day.")
      .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Choose the day.")
      .refine((d) => d <= today, "The day can't be in the future.")
      .refine((d) => d >= oldestDay, `Only the last ${MAX_DOSE_AGE_DAYS} days can be logged.`),
    doseMsv: number("dose", 0, 500),
    periodHours: number("period", 1, 720),
    note: z.preprocess(
      (v) => (blank(v) ? null : String(v).trim()),
      z.string().max(200, "Keep the note under 200 characters.").nullable(),
    ),
  });
}

export type DoseInput = z.infer<ReturnType<typeof doseInput>>;
export type DoseField = keyof DoseInput;
