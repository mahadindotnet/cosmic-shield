"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "./dal";
import { generateTemporaryPin, hashPin } from "./pin";
import { crewIdSchema } from "./schemas";
import {
  audit,
  findUserByCrewId,
  findUserById,
  saveCrewId,
  saveLockState,
  savePin,
} from "./users";
import { UNLOCKED } from "./lockout";

export interface AdminActionState {
  error?: string;
  /** Shown once after a reset; never stored or logged. */
  tempPin?: string;
  crewId?: string;
  message?: string;
}

function targetUser(formData: FormData) {
  const id = Number(formData.get("userId"));
  return Number.isInteger(id) ? findUserById(id) : null;
}

/** Reset a PIN: issue a temporary PIN and force a change at next sign-in. */
export async function resetPinAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { user: surgeon } = await requireRole("flight_surgeon");
  const target = targetUser(formData);
  if (!target) return { error: "Account not found" };

  const tempPin = generateTemporaryPin();
  savePin(target.id, await hashPin(tempPin), true);
  audit(target.crewId, true, `pin_reset_by_${surgeon.crewId}`);
  revalidatePath("/dashboard/admin");
  return {
    tempPin,
    crewId: target.crewId,
    message: "Temporary PIN issued. They must choose a new PIN at sign-in.",
  };
}

export async function unlockAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { user: surgeon } = await requireRole("flight_surgeon");
  const target = targetUser(formData);
  if (!target) return { error: "Account not found" };

  saveLockState(target.id, UNLOCKED);
  audit(target.crewId, true, `unlocked_by_${surgeon.crewId}`);
  revalidatePath("/dashboard/admin");
  return { crewId: target.crewId, message: "Account unlocked." };
}

/** Assign a new crew ID. The prefix must match the role (CS- crew, FS- flight surgeon). */
export async function changeCrewIdAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { user: surgeon } = await requireRole("flight_surgeon");
  const target = targetUser(formData);
  if (!target) return { error: "Account not found" };

  const parsed = crewIdSchema.safeParse(
    String(formData.get("newCrewId") ?? ""),
  );
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid crew ID" };
  const newId = parsed.data;
  const prefix = target.role === "crew" ? "CS-" : "FS-";
  if (!newId.startsWith(prefix))
    return {
      error: `${target.role === "crew" ? "Crew" : "Flight surgeon"} IDs start with ${prefix}`,
    };
  if (newId === target.crewId)
    return { error: "That is already their crew ID" };
  if (findUserByCrewId(newId)) return { error: `${newId} is already assigned` };

  saveCrewId(target.id, newId);
  audit(
    target.crewId,
    true,
    `crew_id_changed_to_${newId}_by_${surgeon.crewId}`,
  );
  audit(
    newId,
    true,
    `crew_id_assigned_from_${target.crewId}_by_${surgeon.crewId}`,
  );
  revalidatePath("/dashboard/admin");
  return {
    crewId: newId,
    message: `Crew ID changed from ${target.crewId} to ${newId}. They sign in with the new ID.`,
  };
}
