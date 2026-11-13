import { z } from "zod";

const blank = (v: unknown) => v === "" || v === null || v === undefined;

const optional = (label: string, max: number, { integer = false } = {}) => {
  let n = z.number({ error: `${label} must be a number.` });
  if (integer) n = n.int(`${label} must be a whole number.`);
  return z.preprocess((v) => (blank(v) ? null : Number(v)), n.min(0, `${label} can't be negative.`).max(max, `${label} must be ${max} or less.`).nullable());
};

export const MAX_BONE_AGE_DAYS = 30;

/**
 * One bone protection log for a day: exercise and/or intake. At least one
 * value must be filled in. Reps need a load (volume = kg × reps).
 */
export function boneInput(today: string) {
  const oldest = new Date(`${today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - MAX_BONE_AGE_DAYS);
  const oldestDay = oldest.toISOString().slice(0, 10);
  return z
    .object({
      day: z
        .string({ error: "Choose the day." })
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the day.")
        .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Choose the day.")
        .refine((d) => d <= today, "The day can't be in the future.")
        .refine((d) => d >= oldestDay, `Only the last ${MAX_BONE_AGE_DAYS} days can be logged.`),
      aerobicMinutes: optional("Aerobic minutes", 600, { integer: true }),
      resistanceMinutes: optional("Resistance minutes", 600, { integer: true }),
      loadKg: optional("Load", 500),
      reps: optional("Reps", 2000, { integer: true }),
      calciumMg: optional("Calcium", 5000),
      vitaminDIu: optional("Vitamin D", 10000),
      note: z.preprocess((v) => (blank(v) ? null : String(v).trim() || null), z.string().max(200, "Keep the note under 200 characters.").nullable()),
    })
    .refine((v) => [v.aerobicMinutes, v.resistanceMinutes, v.loadKg, v.calciumMg, v.vitaminDIu].some((x) => (x ?? 0) > 0), {
      path: ["aerobicMinutes"],
      message: "Log some exercise or intake.",
    })
    .refine((v) => v.reps === null || (v.loadKg ?? 0) > 0, { path: ["loadKg"], message: "Add the load (kg) for those reps." });
}

export type BoneInput = {
  day: string;
  aerobicMinutes: number | null;
  resistanceMinutes: number | null;
  loadKg: number | null;
  reps: number | null;
  calciumMg: number | null;
  vitaminDIu: number | null;
  note: string | null;
};
export type BoneField = keyof BoneInput;
