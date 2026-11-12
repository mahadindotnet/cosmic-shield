import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { Role, SessionPayload } from "./session-token";
import { findUserById, type UserRow } from "./users";

export interface CurrentUser {
  session: SessionPayload;
  user: UserRow;
}

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * The signed-in user, re-read from the database on every request (so a
 * changed crew ID, reset PIN or deleted account takes effect immediately).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = findUserById(session.uid);
  if (!user || user.crewId !== session.crewId) return null;
  return { session, user };
});

/**
 * For pages and Server Actions. Redirects to /login when signed out, and to
 * /change-pin while a PIN change is pending (unless `allowPendingPinChange`).
 */
export async function requireUser(
  opts: { allowPendingPinChange?: boolean } = {},
): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.user.mustChangePin && !opts.allowPendingPinChange)
    redirect("/change-pin");
  return current;
}

/**
 * Requires a role. In Server Actions it throws (the action fails); pages pass
 * `onDenied: "redirect"` to send the user back to the dashboard instead.
 */
export async function requireRole(
  role: Role,
  opts: { onDenied?: "throw" | "redirect" } = {},
): Promise<CurrentUser> {
  const current = await requireUser();
  if (current.user.role !== role) {
    if (opts.onDenied === "redirect") redirect("/dashboard?denied=admin");
    throw new AuthError(403, "Not allowed");
  }
  return current;
}

/** For route handlers: the user, or null (respond 401). Pending PIN changes count as signed out. */
export async function getApiUser(): Promise<CurrentUser | null> {
  const current = await getCurrentUser();
  return current && !current.user.mustChangePin ? current : null;
}

/** The crew member whose own data this user acts on: crew only (a flight surgeon has none). */
export function activeCrew(current: CurrentUser): UserRow | null {
  return current.user.role === "crew" ? current.user : null;
}

/** May `current` see crew member `crewId`'s data? */
export function canViewCrew(current: CurrentUser, crewId: string) {
  return (
    current.user.role === "flight_surgeon" || current.user.crewId === crewId
  );
}
