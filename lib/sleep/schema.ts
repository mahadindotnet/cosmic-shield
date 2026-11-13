import { z } from "zod";

const blank = (v: unknown) => v === "" || v === null || v === undefined;

const ranged = (label: string, min: number, max: number, integer: boolean) => {
  let n = z.number({ error: (iss) => (iss.input === undefined ? `Enter ${label}.` : `${label} must be a number.`) });
  if (integer) n = n.int(`${label} must be a whole number.`);
  return n.min(min, `${label} must be ${min}–${max}.`).max(max, `${label} must be ${min}–${max}.`);
};

/** Required number; blank → "Enter …". */
const num = (label: string, min: number, max: number, { integer = false } = {}) =>
  z.preprocess((v) => (blank(v) ? undefined : Number(v)), ranged(label, min, max, integer));

/** Optional number; blank → null. */
const optionalNum = (label: string, min: number, max: number, { integer = false } = {}) =>
  z.preprocess((v) => (blank(v) ? null : Number(v)), ranged(label, min, max, integer).nullable());

/** Oldest night that can be logged, in days before today. */
export const MAX_NIGHT_AGE_DAYS = 30;

/**
 * One night of Sleep & Stress, validated against `today` (YYYY-MM-DD, UTC).
 * `night` is the date the sleep period started.
 */
export function sleepInput(today: string) {
  const oldest = new Date(`${today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - MAX_NIGHT_AGE_DAYS);
  const oldestDay = oldest.toISOString().slice(0, 10);
  return z.object({
    night: z
      .string({ error: "Choose the night." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the night.")
      .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Choose the night.")
      .refine((d) => d <= today, "The night can't be in the future.")
      .refine((d) => d >= oldestDay, `Only the last ${MAX_NIGHT_AGE_DAYS} nights can be logged.`),
    sleepHours: num("sleep", 0, 16),
    quality: num("sleep quality", 1, 5, { integer: true }),
    hrvRmssd: optionalNum("HRV", 5, 250),
    stress: num("stress", 1, 5, { integer: true }),
  });
}

export type SleepInput = z.infer<ReturnType<typeof sleepInput>>;
export type SleepField = keyof SleepInput;
