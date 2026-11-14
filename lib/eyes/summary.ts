import { photoAnalysisLabel } from "./classifier";
import { amslerChanged, describeAmsler, evaluateAmsler, EYES, type AmslerEvaluation, type AmslerTest, type Cell, type EyeSide, type EyeStatus } from "./rules";

export interface EyeRow {
  id: number;
  /** ISO UTC. */
  recordedAt: string;
  source: "manual" | "seed" | "device";
  kind: "amsler" | "fundus";
  eye: EyeSide | "both";
  /** Amsler only. */
  marks: Cell[];
  /** Amsler only (null for fundus). */
  centreVisible: boolean | null;
  /** Fundus: a photo is stored (the path never leaves the server). */
  hasPhoto: boolean;
  photoAnalysis: string | null;
  groundReview: boolean;
  note: string | null;
}

export interface EyeHistoryRow extends EyeRow {
  /** "No change noticed", "3 cells marked; centre dot not seen", or the photo label. */
  result: string;
  /** Amsler: normal / watch. Fundus: no status (never analysed). */
  status: Exclude<EyeStatus, "no-data"> | null;
}

export interface EyeSummary {
  amsler: AmslerEvaluation;
  /** Latest fundus photo (any eye), or null. */
  lastFundus: EyeHistoryRow | null;
  /** Newest screening of any kind (ISO), or null. */
  lastScreeningAt: string | null;
  history: EyeHistoryRow[];
  /** Health Dashboard tile: cells marked on the latest test of each eye, and the status. */
  tile: { metric: string; value: string; unit: string; status: Exclude<EyeStatus, "no-data"> } | null;
}

const byNewest = (a: EyeRow, b: EyeRow) => b.recordedAt.localeCompare(a.recordedAt) || b.id - a.id;

export function amslerTests(rows: readonly EyeRow[]): AmslerTest[] {
  return rows
    .filter((r) => r.kind === "amsler" && r.eye !== "both")
    .map((r) => ({ id: r.id, recordedAt: r.recordedAt, eye: r.eye as EyeSide, marks: r.marks, centreVisible: r.centreVisible ?? true }));
}

export function summarizeEyes(rows: readonly EyeRow[]): EyeSummary {
  const history: EyeHistoryRow[] = [...rows].sort(byNewest).map((r) => {
    if (r.kind === "amsler") {
      const t = { marks: r.marks, centreVisible: r.centreVisible ?? true };
      return { ...r, result: describeAmsler(t), status: amslerChanged(t) ? "watch" : "normal" };
    }
    const label = r.hasPhoto ? photoAnalysisLabel(r.photoAnalysis) : "No photo";
    return { ...r, result: r.groundReview ? `${label} · flagged for ground review` : label, status: null };
  });
  const amsler = evaluateAmsler(amslerTests(rows));
  const tested = EYES.map((e) => amsler.latest[e]).filter((t): t is AmslerTest => t !== null);
  return {
    amsler,
    lastFundus: history.find((r) => r.kind === "fundus") ?? null,
    lastScreeningAt: history[0]?.recordedAt ?? null,
    history,
    tile:
      amsler.status === "no-data"
        ? null
        : {
            metric: "Amsler: cells marked (latest)",
            value: String(tested.reduce((n, t) => n + t.marks.length, 0)),
            unit: "cells",
            status: amsler.status,
          },
  };
}
