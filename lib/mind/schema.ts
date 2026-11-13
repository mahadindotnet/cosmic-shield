import { z } from "zod";

const blank = (v: unknown) => v === "" || v === null || v === undefined;

const rating = (label: string, { optional = false } = {}) => {
  const n = z
    .number({ error: (iss) => (iss.input === undefined ? `Choose ${label}.` : `${label} must be a number.`) })
    .int(`${label} must be a whole number.`)
    .min(1, `${label} must be 1–5.`)
    .max(5, `${label} must be 1–5.`);
  return optional
    ? z.preprocess((v) => (blank(v) ? null : Number(v)), n.nullable())
    : z.preprocess((v) => (blank(v) ? undefined : Number(v)), n);
};

export const NOTE_MAX = 280;

/** One daily check-in. All scales 1–5. */
export const CheckinInput = z.object({
  mood: rating("your mood"),
  stress: rating("your stress"),
  sleepQuality: rating("sleep quality", { optional: true }),
  note: z.preprocess(
    (v) => (blank(v) ? null : String(v).trim() || null),
    z.string().max(NOTE_MAX, `Keep the note under ${NOTE_MAX} characters.`).nullable(),
  ),
});

export type CheckinInput = {
  mood: number;
  stress: number;
  sleepQuality: number | null;
  note: string | null;
};
export type CheckinField = keyof CheckinInput;
