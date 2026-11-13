"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeCrew, requireUser } from "@/lib/auth/dal";
import { getMissionEnvironment, type MissionEnvironmentId } from "@/lib/mission/environments";
import { recordCheckin } from "./data";
import { CheckinInput, type CheckinField } from "./schema";

export interface LogCheckinState {
  ok?: boolean;
  /** The note triggered the safety check: show the caring response. */
  safety?: boolean;
  /** For the safety response: the crew member's environment and comms delay. */
  environment?: { name: string; commsDelayOneWay: string } | null;
  error?: string;
  fieldErrors?: Partial<Record<CheckinField, string>>;
  values?: Partial<Record<CheckinField, string>>;
  savedAt?: number;
}

const FIELDS: CheckinField[] = ["mood", "stress", "sleepQuality", "note"];

/** Saves the signed-in crew member's daily check-in. Flight surgeons are view-only. */
export async function logCheckinAction(_prev: LogCheckinState, formData: FormData): Promise<LogCheckinState> {
  const current = await requireUser();
  const crew = activeCrew(current);
  if (!crew) return { error: "Flight surgeons can view crew data but not enter it." };

  const raw = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const parsed = CheckinInput.safeParse(raw);
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors as Partial<Record<CheckinField, string[]>>;
    return {
      error: "Check the highlighted fields.",
      fieldErrors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v?.[0]])),
      values: raw,
    };
  }

  const { safety } = recordCheckin(crew, current.user.id, parsed.data as CheckinInput);
  revalidatePath("/dashboard/mind");
  revalidatePath("/dashboard");
  const env = getMissionEnvironment((crew.environment as MissionEnvironmentId | null) ?? null);
  return {
    ok: true,
    safety,
    environment: env ? { name: env.name, commsDelayOneWay: env.commsDelayLabel } : null,
    savedAt: Date.now(),
  };
}
