import "server-only";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAudit, users } from "@/lib/db/schema";
import { CREW_ID_PATTERN } from "./config";
import type { LockState } from "./lockout";

export type UserRow = typeof users.$inferSelect;

export function findUserByCrewId(crewId: string): UserRow | null {
  return db.select().from(users).where(eq(users.crewId, crewId)).get() ?? null;
}

export function findUserById(id: number): UserRow | null {
  return db.select().from(users).where(eq(users.id, id)).get() ?? null;
}

export function listUsers(): UserRow[] {
  return db.select().from(users).orderBy(asc(users.role), asc(users.crewId)).all();
}

export function saveLockState(id: number, state: LockState) {
  db.update(users).set({ failedAttempts: state.failedAttempts, lockedUntil: state.lockedUntil }).where(eq(users.id, id)).run();
}

export function savePin(id: number, pinHash: string, mustChangePin: boolean) {
  db.update(users).set({ pinHash, mustChangePin, failedAttempts: 0, lockedUntil: null }).where(eq(users.id, id)).run();
}

export function saveCrewId(id: number, crewId: string) {
  db.update(users).set({ crewId }).where(eq(users.id, id)).run();
}

/**
 * Only well-formed crew IDs are stored as-is. Anything else (which could be a
 * mistyped PIN in the wrong field) is recorded as "(invalid)".
 */
export function auditCrewId(raw: string) {
  const v = raw.trim().toUpperCase();
  return CREW_ID_PATTERN.test(v) ? v : "(invalid)";
}

/** Writes one audit row. Never pass PINs, hashes or secrets in `reason`. */
export function audit(crewId: string, success: boolean, reason: string, timestamp = Date.now()) {
  db.insert(loginAudit).values({ crewId: auditCrewId(crewId), success, reason, timestamp }).run();
}

/** Login attempts for an ID since `since` (oldest first), used to lock unknown IDs. */
export function attemptsSince(crewId: string, since: number) {
  return db
    .select({ timestamp: loginAudit.timestamp, success: loginAudit.success, reason: loginAudit.reason })
    .from(loginAudit)
    .where(and(eq(loginAudit.crewId, crewId), gte(loginAudit.timestamp, since)))
    .orderBy(asc(loginAudit.timestamp))
    .all();
}

export function recentAudit(limit = 200) {
  return db.select().from(loginAudit).orderBy(desc(loginAudit.timestamp), desc(loginAudit.id)).limit(limit).all();
}

/** Recent audit rows for one crew ID, newest first. */
export function auditFor(crewId: string, limit = 8) {
  return db
    .select()
    .from(loginAudit)
    .where(eq(loginAudit.crewId, crewId))
    .orderBy(desc(loginAudit.timestamp), desc(loginAudit.id))
    .limit(limit)
    .all();
}
