import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { UserRow } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { escalation, eyeScreening } from "@/lib/db/schema";
import {
  amslerChanged,
  changedRun,
  describeAmsler,
  EYE_AMSLER_REPEAT_ID,
  EYE_GROUND_REVIEW_ID,
  EYE_LIMITS,
  parseMarks,
  SANS_RISK,
} from "./rules";
import type { AmslerInput, FundusInput } from "./schema";
import { summarizeEyes, type EyeRow, type EyeSummary } from "./summary";

const ROW_LIMIT = 300;
type Crew = Pick<UserRow, "id" | "crewId">;

/** Fields of an escalation record that say what it is (never a diagnosis). */
const ESCALATION_NOTE = "Watch level, not a diagnosis.";

/**
 * Saves one Amsler test. When it makes the run of changed tests of that eye
 * reach 2, an `eye_amsler_repeat` escalation record is created for the flight
 * surgeon (once per run). Returns the new entry and whether the surgeon was told.
 */
export function insertAmsler(crew: Crew, enteredBy: number, input: AmslerInput) {
  return db.transaction((tx) => {
    const now = new Date().toISOString();
    const changed = amslerChanged(input);
    const entryId = Number(
      tx
        .insert(eyeScreening)
        .values({
          userId: crew.id,
          enteredBy,
          source: "manual",
          recordedAt: now,
          createdAt: now,
          kind: "amsler",
          eye: input.eye,
          amslerResult: changed ? "distortion" : "normal",
          amslerMarks: JSON.stringify(input.marks),
          centreVisible: input.centreVisible,
          note: input.note,
        })
        .run().lastInsertRowid,
    );

    let escalationId: number | null = null;
    if (changed) {
      const rows = tx
        .select({ id: eyeScreening.id, recordedAt: eyeScreening.recordedAt, amslerMarks: eyeScreening.amslerMarks, centreVisible: eyeScreening.centreVisible })
        .from(eyeScreening)
        .where(and(eq(eyeScreening.userId, crew.id), eq(eyeScreening.kind, "amsler"), eq(eyeScreening.eye, input.eye)))
        .orderBy(desc(eyeScreening.recordedAt), desc(eyeScreening.id))
        .limit(EYE_LIMITS.repeatTestsForSurgeon + 1)
        .all()
        .map((r) => ({ id: r.id, recordedAt: r.recordedAt, eye: input.eye, marks: parseMarks(r.amslerMarks), centreVisible: r.centreVisible ?? true }));
      if (changedRun(rows) === EYE_LIMITS.repeatTestsForSurgeon) {
        const tests = rows.slice(0, EYE_LIMITS.repeatTestsForSurgeon).reverse();
        escalationId = Number(
          tx
            .insert(escalation)
            .values({
              userId: crew.id,
              crewId: crew.crewId,
              ruleId: EYE_AMSLER_REPEAT_ID,
              entryTable: "eye_screening",
              entryId,
              reason: `Vision change noticed on ${EYE_LIMITS.repeatTestsForSurgeon} Amsler tests in a row (${input.eye} eye): ${tests.map((t) => describeAmsler(t)).join(", then ")}. ${ESCALATION_NOTE}`,
              evidenceJson: JSON.stringify({
                level: "watch",
                eye: input.eye,
                tests: tests.map((t) => ({ entryId: t.id, recordedAt: t.recordedAt, markedCells: t.marks.length, centreVisible: t.centreVisible })),
                basis: "app default rule; why eyes are monitored: " + SANS_RISK.title,
              }),
              createdAt: now,
            })
            .run().lastInsertRowid,
        );
      }
    }
    return { entryId, changed, escalationId };
  });
}

/** Saves one fundus photo entry; "Flag for ground review" also creates an escalation record (Watch level). */
export function insertFundus(crew: Crew, enteredBy: number, input: FundusInput, photo: { path: string; analysis: string }) {
  return db.transaction((tx) => {
    const now = new Date().toISOString();
    const entryId = Number(
      tx
        .insert(eyeScreening)
        .values({
          userId: crew.id,
          enteredBy,
          source: "manual",
          recordedAt: now,
          createdAt: now,
          kind: "fundus",
          eye: input.eye,
          photoPath: photo.path,
          photoAnalysis: photo.analysis,
          groundReview: input.groundReview,
          note: input.note,
        })
        .run().lastInsertRowid,
    );
    let escalationId: number | null = null;
    if (input.groundReview)
      escalationId = Number(
        tx
          .insert(escalation)
          .values({
            userId: crew.id,
            crewId: crew.crewId,
            ruleId: EYE_GROUND_REVIEW_ID,
            entryTable: "eye_screening",
            entryId,
            reason: `Fundus photo (${input.eye} eye) flagged for ground review by the crew member. Not analysed: prototype. ${ESCALATION_NOTE}`,
            evidenceJson: JSON.stringify({ level: "watch", eye: input.eye, photoEntryId: entryId, analysis: photo.analysis }),
            createdAt: now,
          })
          .run().lastInsertRowid,
      );
    return { entryId, escalationId };
  });
}

/** One user's eye screenings, newest first. Callers must have checked access to `userId`. */
export function eyeRowsFor(userId: number): EyeRow[] {
  return db
    .select({
      id: eyeScreening.id,
      recordedAt: eyeScreening.recordedAt,
      source: eyeScreening.source,
      kind: eyeScreening.kind,
      eye: eyeScreening.eye,
      amslerMarks: eyeScreening.amslerMarks,
      centreVisible: eyeScreening.centreVisible,
      photoPath: eyeScreening.photoPath,
      photoAnalysis: eyeScreening.photoAnalysis,
      groundReview: eyeScreening.groundReview,
      note: eyeScreening.note,
    })
    .from(eyeScreening)
    .where(eq(eyeScreening.userId, userId))
    .orderBy(desc(eyeScreening.recordedAt), desc(eyeScreening.id))
    .limit(ROW_LIMIT)
    .all()
    .map(({ amslerMarks, photoPath, ...r }) => ({
      ...r,
      marks: r.kind === "amsler" ? parseMarks(amslerMarks) : [],
      centreVisible: r.kind === "amsler" ? (r.centreVisible ?? true) : null,
      hasPhoto: photoPath !== null,
    }));
}

export function eyeSummaryFor(userId: number): EyeSummary {
  return summarizeEyes(eyeRowsFor(userId));
}

/** The stored photo of one entry, with its owner (for the access check). */
export function eyePhotoRow(entryId: number) {
  return db.select({ userId: eyeScreening.userId, photoPath: eyeScreening.photoPath }).from(eyeScreening).where(eq(eyeScreening.id, entryId)).get() ?? null;
}
