import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkIn } from "@/lib/db/schema";
import { getCrewDashboard, listCrewSummaries } from "@/lib/demo/crew-profiles";
import type { CrewDashboardPayload } from "@/lib/rules/types";

export function getCrewList() {
  return listCrewSummaries();
}

export async function getCrewDashboardWithLogs(crewId: string): Promise<CrewDashboardPayload | null> {
  const base = getCrewDashboard(crewId);
  if (!base) return null;

  try {
    const rows = await db
      .select()
      .from(checkIn)
      .where(eq(checkIn.crewId, crewId))
      .orderBy(desc(checkIn.id))
      .limit(20);

    if (rows.length === 0) return base;

    const behavioralLog = rows.map((r) => ({
      at: r.recordedAt,
      affectScore: r.affectScore,
      note: r.note,
    }));

    return { ...base, behavioralLog };
  } catch {
    return base;
  }
}
