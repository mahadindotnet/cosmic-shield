import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { MIND_SAFETY_ID, SAFETY_REASON, type CrisisCategory } from "@/lib/ai/safety";
import { AuthError } from "@/lib/auth/dal";
import type { UserRow } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { escalation } from "@/lib/db/schema";

/** Messages kept in a safety escalation (the most recent user messages only). */
const MAX_MESSAGES = 6;
const MAX_CHARS = 500;

export type SafetySource = "support_chat" | "copilot_chat" | "checkin_note";

export interface SafetyEvidence {
  source: SafetySource;
  /** useChat conversation id; null for a check-in note. */
  conversationId: string | null;
  categories: CrisisCategory[];
  /** The crew member's own words, most recent last. Shown to the flight surgeon only. */
  messages: { at: string; text: string }[];
}

const clip = (s: string) => (s.length > MAX_CHARS ? `${s.slice(0, MAX_CHARS)}…` : s);

/**
 * Records a safety escalation (rule mind_safety) for `user`. In a chat, at
 * most one open record per conversation: later triggering messages are added
 * to it. A check-in note always gets its own record. Returns the record id.
 */
export function recordSafetyEscalation(
  user: Pick<UserRow, "id" | "crewId">,
  input: { source: SafetySource; conversationId: string | null; categories: CrisisCategory[]; recentMessages: string[] },
): number {
  const now = new Date().toISOString();
  const incoming = input.recentMessages.slice(-MAX_MESSAGES).map((text) => ({ at: now, text: clip(text) }));

  return db.transaction((tx) => {
    if (input.conversationId) {
      const open = tx
        .select()
        .from(escalation)
        .where(and(eq(escalation.userId, user.id), eq(escalation.ruleId, MIND_SAFETY_ID), isNull(escalation.reviewedAt)))
        .orderBy(desc(escalation.createdAt))
        .all()
        .find((e) => (JSON.parse(e.evidenceJson) as SafetyEvidence).conversationId === input.conversationId);
      if (open) {
        const ev = JSON.parse(open.evidenceJson) as SafetyEvidence;
        const known = new Set(ev.messages.map((m) => m.text));
        const merged: SafetyEvidence = {
          ...ev,
          categories: [...new Set([...ev.categories, ...input.categories])],
          messages: [...ev.messages, ...incoming.filter((m) => !known.has(m.text))].slice(-MAX_MESSAGES * 2),
        };
        tx.update(escalation).set({ evidenceJson: JSON.stringify(merged) }).where(eq(escalation.id, open.id)).run();
        return open.id;
      }
    }
    const evidence: SafetyEvidence = { source: input.source, conversationId: input.conversationId, categories: input.categories, messages: incoming };
    const row = tx
      .insert(escalation)
      .values({
        userId: user.id,
        crewId: user.crewId,
        ruleId: MIND_SAFETY_ID,
        entryTable: input.source === "checkin_note" ? "checkin" : "chat",
        entryId: 0,
        reason: SAFETY_REASON,
        evidenceJson: JSON.stringify(evidence),
        createdAt: now,
      })
      .run();
    return Number(row.lastInsertRowid);
  });
}

export interface ReviewEscalation {
  id: number;
  ruleId: string;
  reason: string;
  createdAt: string;
  reviewedAt: number | null;
  /** Parsed evidence. For mind_safety this includes the message excerpt. */
  evidence: unknown;
}

/**
 * Escalation records for one crew member, with full evidence, for the Crew
 * admin page. Flight surgeon only: anyone else gets a 403, so crew can never
 * read another crew member's records or any message excerpt.
 */
export function escalationsForReview(viewer: Pick<UserRow, "role">, crewUserId: number, limit = 20): ReviewEscalation[] {
  if (viewer.role !== "flight_surgeon") throw new AuthError(403, "Not allowed");
  return db
    .select()
    .from(escalation)
    .where(eq(escalation.userId, crewUserId))
    .orderBy(desc(escalation.createdAt), desc(escalation.id))
    .limit(limit)
    .all()
    .map((e) => ({ id: e.id, ruleId: e.ruleId, reason: e.reason, createdAt: e.createdAt, reviewedAt: e.reviewedAt, evidence: JSON.parse(e.evidenceJson) }));
}
