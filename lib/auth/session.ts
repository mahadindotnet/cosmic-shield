import "server-only";
import { cookies } from "next/headers";
import { ABSOLUTE_SESSION_MS, cookieSecure, CREW_ID_PATTERN, LAST_CREW_COOKIE, SESSION_COOKIE } from "./config";
import { readSessionToken, sessionStatus, signSession, type SessionPayload } from "./session-token";

const baseCookie = () => ({
  httpOnly: true,
  secure: cookieSecure(),
  sameSite: "lax" as const,
  path: "/",
});

/** The current session if it is signed, within 12 h and not idle; otherwise null. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session || sessionStatus(session, Date.now()) !== "active") return null;
  return session;
}

export async function setSession(payload: SessionPayload) {
  const remaining = Math.max(0, payload.issuedAt + ABSOLUTE_SESSION_MS - Date.now());
  (await cookies()).set(SESSION_COOKIE, await signSession(payload), {
    ...baseCookie(),
    maxAge: Math.floor(remaining / 1000),
  });
}

export async function clearSession() {
  (await cookies()).set(SESSION_COOKIE, "", { ...baseCookie(), maxAge: 0 });
}

/** Remembers the crew ID so the PIN screen can pre-fill it after a lock. */
export async function rememberCrewId(crewId: string) {
  (await cookies()).set(LAST_CREW_COOKIE, crewId, { ...baseCookie(), maxAge: 30 * 24 * 60 * 60 });
}

export async function forgetCrewId() {
  (await cookies()).set(LAST_CREW_COOKIE, "", { ...baseCookie(), maxAge: 0 });
}

export async function getRememberedCrewId(): Promise<string | null> {
  const v = (await cookies()).get(LAST_CREW_COOKIE)?.value ?? "";
  return CREW_ID_PATTERN.test(v) ? v : null;
}
