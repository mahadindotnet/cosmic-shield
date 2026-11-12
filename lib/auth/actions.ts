"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "./dal";
import { isLocked, registerFailure, registerSuccess, replayAttempts } from "./lockout";
import { hashPin, verifyPin } from "./pin";
import { loginSchema, newPinSchema, pinSchema } from "./schemas";
import { clearSession, forgetCrewId, getSession, rememberCrewId, setSession } from "./session";
import { attemptsSince, audit, findUserByCrewId, saveLockState, savePin } from "./users";

const GENERIC_ERROR = "Invalid crew ID or PIN";
const UNKNOWN_ID_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface LoginState {
  error?: string;
  fieldErrors?: { crewId?: string; pin?: string };
  /** Epoch ms when the lock ends, for the countdown. */
  lockedUntil?: number;
  crewId?: string;
}

/** Equalises timing for unknown IDs: bcrypt runs whether or not the ID exists. */
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPin("000000"));

/** Only same-site dashboard paths are allowed as a post-login destination. */
function safeNext(raw: FormDataEntryValue | null) {
  const v = typeof raw === "string" ? raw : "";
  return /^\/dashboard(\/[a-z0-9-]*)*$/.test(v) ? v : "/dashboard";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawCrewId = String(formData.get("crewId") ?? "");
  const parsed = loginSchema.safeParse({ crewId: rawCrewId, pin: String(formData.get("pin") ?? "") });
  if (!parsed.success) {
    const f = z.flattenError(parsed.error).fieldErrors;
    audit(rawCrewId, false, "invalid_format");
    return { fieldErrors: { crewId: f.crewId?.[0], pin: f.pin?.[0] }, crewId: rawCrewId.trim().toUpperCase() };
  }

  const { crewId, pin } = parsed.data;
  const now = Date.now();
  const user = findUserByCrewId(crewId);

  // Unknown IDs keep their lock state in the audit log so they lock like real ones.
  const state = user
    ? { failedAttempts: user.failedAttempts, lockedUntil: user.lockedUntil }
    : replayAttempts(attemptsSince(crewId, now - UNKNOWN_ID_WINDOW_MS));

  if (isLocked(state, now)) {
    audit(crewId, false, "locked");
    return { error: "Too many attempts. This account is locked.", lockedUntil: state.lockedUntil!, crewId };
  }

  const ok = await verifyPin(pin, user?.pinHash ?? (await getDummyHash()));
  if (!user || !ok) {
    const next = registerFailure(state, now);
    if (user) saveLockState(user.id, next);
    audit(crewId, false, user ? "bad_pin" : "unknown_id");
    return isLocked(next, now)
      ? { error: "Too many attempts. This account is locked.", lockedUntil: next.lockedUntil!, crewId }
      : { error: GENERIC_ERROR, crewId };
  }

  saveLockState(user.id, registerSuccess());
  audit(crewId, true, "ok");
  await setSession({
    uid: user.id,
    crewId: user.crewId,
    role: user.role,
    issuedAt: now,
    lastActive: now,
    mustChangePin: user.mustChangePin,
  });
  await rememberCrewId(user.crewId);
  redirect(user.mustChangePin ? "/change-pin" : safeNext(formData.get("next")));
}

/** Lock: end the session but keep the crew ID so the PIN screen is pre-filled. */
export async function lockAction(reason?: "idle" | FormData) {
  const session = await getSession();
  if (session) {
    audit(session.crewId, true, reason === "idle" ? "auto_lock" : "lock");
    await rememberCrewId(session.crewId);
  }
  await clearSession();
  redirect("/login?locked=1");
}

export async function logoutAction() {
  const session = await getSession();
  if (session) audit(session.crewId, true, "logout");
  await clearSession();
  await forgetCrewId();
  redirect("/login");
}

export interface ChangePinState {
  error?: string;
  fieldErrors?: { currentPin?: string; newPin?: string; confirmPin?: string };
  ok?: boolean;
}

/**
 * Change PIN. After a flight-surgeon reset (mustChangePin) the user has just
 * proved the temporary PIN, so no current PIN is asked for; otherwise the
 * current PIN is required and wrong guesses count towards the lockout.
 */
export async function changePinAction(_prev: ChangePinState, formData: FormData): Promise<ChangePinState> {
  const { user, session } = await requireUser({ allowPendingPinChange: true });
  const forced = user.mustChangePin;
  const currentPin = String(formData.get("currentPin") ?? "");
  const newPin = String(formData.get("newPin") ?? "");
  const confirmPin = String(formData.get("confirmPin") ?? "");

  if (!forced) {
    if (!pinSchema.safeParse(currentPin).success) return { fieldErrors: { currentPin: "Enter your current 6-digit PIN" } };
    const now = Date.now();
    const state = { failedAttempts: user.failedAttempts, lockedUntil: user.lockedUntil };
    if (isLocked(state, now) || !(await verifyPin(currentPin, user.pinHash))) {
      const next = isLocked(state, now) ? state : registerFailure(state, now);
      saveLockState(user.id, next);
      audit(user.crewId, false, "change_pin_bad_current");
      if (isLocked(next, now)) {
        await clearSession();
        redirect("/login?locked=1");
      }
      return { fieldErrors: { currentPin: "Current PIN is incorrect" } };
    }
  }

  const parsed = newPinSchema.safeParse(newPin);
  if (!parsed.success) return { fieldErrors: { newPin: parsed.error.issues[0]?.message } };
  if (newPin !== confirmPin) return { fieldErrors: { confirmPin: "PINs do not match" } };
  if (await verifyPin(newPin, user.pinHash)) return { fieldErrors: { newPin: "Choose a PIN different from the current one" } };

  savePin(user.id, await hashPin(newPin), false);
  audit(user.crewId, true, forced ? "pin_set_after_reset" : "pin_changed");
  await setSession({ ...session, mustChangePin: false, lastActive: Date.now() });
  if (forced) redirect("/dashboard");
  return { ok: true };
}

