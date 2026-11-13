import "server-only";
import { desc, eq } from "drizzle-orm";
import { utcToday } from "@/lib/alerts/data";
import type { UserRow } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { giEntry } from "@/lib/db/schema";
import type { GiInput } from "./schema";
import { summarizeGi, type GiRow, type GiSummary } from "./summary";

const ROW_LIMIT = 300;

export function insertGi(
  crew: Pick<UserRow, "id">,
  enteredBy: number,
  input: GiInput,
  photo: { path: string; analysis: string } | null,
) {
  const now = new Date();
  return db
    .insert(giEntry)
    .values({
      userId: crew.id,
      enteredBy,
      source: "manual",
      // Today: now; an earlier day: midday UTC of that day.
      recordedAt: input.day === now.toISOString().slice(0, 10) ? now.toISOString() : `${input.day}T12:00:00.000Z`,
      createdAt: now.toISOString(),
      bristolType: input.bristolType,
      hydrationLiters: input.hydrationLiters,
      note: input.note,
      photoPath: photo?.path ?? null,
      photoAnalysis: photo?.analysis ?? null,
    })
    .run();
}

/** One user's GI entries, newest first. Callers must have checked access to `userId`. */
export function giRowsFor(userId: number): GiRow[] {
  return db
    .select({
      id: giEntry.id,
      recordedAt: giEntry.recordedAt,
      source: giEntry.source,
      bristolType: giEntry.bristolType,
      hydrationLiters: giEntry.hydrationLiters,
      note: giEntry.note,
      photoPath: giEntry.photoPath,
      photoAnalysis: giEntry.photoAnalysis,
    })
    .from(giEntry)
    .where(eq(giEntry.userId, userId))
    .orderBy(desc(giEntry.recordedAt), desc(giEntry.id))
    .limit(ROW_LIMIT)
    .all()
    .map(({ photoPath, ...r }) => ({ ...r, hasPhoto: photoPath !== null }));
}

export function giSummaryFor(userId: number, days = 14): GiSummary {
  return summarizeGi(giRowsFor(userId), utcToday(), days);
}

/** The stored photo of one entry, with its owner (for the access check). */
export function giPhotoRow(entryId: number) {
  return (
    db
      .select({ userId: giEntry.userId, photoPath: giEntry.photoPath })
      .from(giEntry)
      .where(eq(giEntry.id, entryId))
      .get() ?? null
  );
}
