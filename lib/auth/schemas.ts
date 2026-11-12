import { z } from "zod";
import { CREW_ID_PATTERN } from "./config";
import { isWeakPin, PIN_PATTERN } from "./pin-rules";

export const crewIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(CREW_ID_PATTERN, "Crew ID looks like CS-001 or FS-001");

export const pinSchema = z.string().regex(PIN_PATTERN, "PIN must be exactly 6 digits");

export const loginSchema = z.object({ crewId: crewIdSchema, pin: pinSchema });

export const newPinSchema = pinSchema.refine((p) => !isWeakPin(p), {
  message: "Too easy to guess. Avoid repeated digits (111111) and runs (123456, 654321).",
});
