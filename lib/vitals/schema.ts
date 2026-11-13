import { z } from "zod";

/** Form value → number; blank → undefined (so "required" reads as such). */
const field = (label: string, min: number, max: number, { integer = true } = {}) => {
  let n = z.number({ error: (iss) => (iss.input === undefined ? `Enter ${label}.` : `${label} must be a number.`) });
  if (integer) n = n.int(`${label} must be a whole number.`);
  return z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    n.min(min, `${label} must be ${min}–${max}.`).max(max, `${label} must be ${min}–${max}.`),
  );
};

/** One set of vitals taken together. Ranges reject typos, not abnormal values. */
export const VitalsInput = z
  .object({
    heartRate: field("heart rate", 20, 250),
    spo2: field("SpO₂", 50, 100),
    systolic: field("systolic", 50, 250),
    diastolic: field("diastolic", 30, 150),
    glucose: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z
        .number({ error: "Glucose must be a number." })
        .min(20, "Glucose must be 20–600.")
        .max(600, "Glucose must be 20–600.")
        .nullable(),
    ),
  })
  .refine((v) => v.systolic > v.diastolic, {
    path: ["diastolic"],
    message: "Diastolic must be lower than systolic.",
  });

export type VitalsInput = z.infer<typeof VitalsInput>;
export type VitalsField = keyof VitalsInput;
