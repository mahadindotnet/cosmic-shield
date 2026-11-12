/**
 * Signed session token (JWT, HS256 via jose). Pure: used by proxy.ts, server
 * code and unit tests. The cookie wrapper lives in session.ts.
 */
import { jwtVerify, SignJWT } from "jose";
import { ABSOLUTE_SESSION_MS, getSessionSecret, IDLE_TIMEOUT_MS } from "./config";

export type Role = "crew" | "flight_surgeon";

export interface SessionPayload {
  /** users.id */
  uid: number;
  crewId: string;
  role: Role;
  /** Epoch ms when the user signed in (absolute limit). */
  issuedAt: number;
  /** Epoch ms of the last request or activity ping (idle limit). */
  lastActive: number;
  mustChangePin: boolean;
}

export type SessionStatus = "active" | "idle" | "expired";

/** 12-hour absolute limit first, then the 15-minute idle limit. */
export function sessionStatus(s: Pick<SessionPayload, "issuedAt" | "lastActive">, now: number): SessionStatus {
  if (now - s.issuedAt >= ABSOLUTE_SESSION_MS) return "expired";
  if (now - s.lastActive >= IDLE_TIMEOUT_MS) return "idle";
  return "active";
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(payload.issuedAt / 1000))
    .setExpirationTime(Math.floor((payload.issuedAt + ABSOLUTE_SESSION_MS) / 1000))
    .sign(getSessionSecret());
}

/** The payload if the signature is valid and not past the absolute limit; otherwise null. */
export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
    const p = payload as unknown as SessionPayload;
    if (typeof p.uid !== "number" || typeof p.crewId !== "string" || typeof p.lastActive !== "number") return null;
    return {
      uid: p.uid,
      crewId: p.crewId,
      role: p.role === "flight_surgeon" ? "flight_surgeon" : "crew",
      issuedAt: p.issuedAt,
      lastActive: p.lastActive,
      mustChangePin: Boolean(p.mustChangePin),
    };
  } catch {
    return null;
  }
}
