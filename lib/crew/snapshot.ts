import "server-only";
import { activeAlertsFor, type ActiveAlert } from "@/lib/alerts/active";
import { utcToday } from "@/lib/alerts/data";
import type { UserRow } from "@/lib/auth/users";
import { boneSummaryFor } from "@/lib/bone/data";
import { eyeSummaryFor } from "@/lib/eyes/data";
import { giSummaryFor } from "@/lib/gi/data";
import { getMissionEnvironment, type MissionEnvironmentId } from "@/lib/mission/environments";
import { mindSummaryFor } from "@/lib/mind/data";
import { radiationSummaryFor } from "@/lib/radiation/data";
import { sleepSummaryFor } from "@/lib/sleep/data";
import { vitalsSummaryFor } from "@/lib/vitals/data";

/**
 * One crew member's latest readings, from the module tables only (the same
 * summaries and rules as the module pages and the Health Dashboard tiles), and
 * their active alerts from lib/alerts/active.ts. No demo snapshots, no made-up
 * values: a module with no entries says so. Private text is never included
 * (no check-in notes, chat text or GI/eye notes; no photo paths).
 *
 * Callers must have checked access (owner or flight surgeon).
 */

export type SnapshotStatus = "normal" | "watch" | "escalate" | "no-data";

export interface ModuleReading {
  module: "vitals" | "sleep-stress" | "radiation" | "bone" | "gi" | "eyes" | "mind";
  label: string;
  /** null when the module has no entries yet. */
  value: string | null;
  unit: string;
  status: SnapshotStatus;
  href: string;
}

export interface CrewSnapshot {
  crewId: string;
  name: string;
  title: string;
  /** Mission environment name, or null when none is chosen. */
  environment: string | null;
  readings: ModuleReading[];
  /** Career dose (sum of all dose entries) and its status against the 600 mSv limit. */
  careerDose: { totalMsv: number; status: Exclude<SnapshotStatus, "no-data"> } | null;
  alerts: ActiveAlert[];
  /** YYYY-MM-DD (UTC) the snapshot was computed for. */
  today: string;
}

type Tile = { metric?: string; value: string; unit: string; status: string } | null;

function reading(module: ModuleReading["module"], label: string, unit: string, tile: Tile): ModuleReading {
  return {
    module,
    label: tile?.metric ?? label,
    value: tile?.value ?? null,
    unit: tile?.unit ?? unit,
    status: (tile?.status as SnapshotStatus | undefined) ?? "no-data",
    href: `/dashboard/${module}`,
  };
}

export function crewSnapshot(user: Pick<UserRow, "id" | "crewId" | "displayName" | "title" | "environment">): CrewSnapshot {
  const today = utcToday();
  const radiation = radiationSummaryFor(user.id, 7);
  const sleep = sleepSummaryFor(user.id, 7).tile;
  const env = getMissionEnvironment((user.environment as MissionEnvironmentId | null) ?? null);
  return {
    crewId: user.crewId,
    name: user.displayName,
    title: user.title,
    environment: env?.name ?? null,
    readings: [
      reading("vitals", "Vitals (latest)", "", vitalsSummaryFor(user.id, 7).tile),
      reading("sleep-stress", "Sleep (latest night)", "h", sleep && { metric: `Sleep, night of ${sleep.night}`, ...sleep }),
      reading("radiation", "Latest dose", "mSv/d", radiation.tile && { metric: "Latest dose", ...radiation.tile }),
      reading("bone", "Exercise today", "min", boneSummaryFor(user, 7).tile),
      reading("gi", "Bristol type (latest)", "/7", giSummaryFor(user.id, 7).tile),
      reading("eyes", "Amsler: cells marked (latest)", "cells", eyeSummaryFor(user.id).tile),
      // Mood score only; check-in notes stay private.
      reading("mind", "Mood (latest)", "/5", mindSummaryFor(user.id, 14).tile),
    ],
    careerDose: !radiation.latest ? null : { totalMsv: radiation.career.totalMsv, status: radiation.career.status },
    alerts: activeAlertsFor(user.id, today).alerts,
    today,
  };
}
