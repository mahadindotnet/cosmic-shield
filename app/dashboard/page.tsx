import type { Metadata } from "next";
import { Suspense } from "react";
import { EarlyWarningSlot } from "@/components/alerts/early-warning-slot";
import { OverviewView, type OverviewData } from "@/components/cosmic-shield/views/overview";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { vitalsSummaryFor } from "@/lib/vitals/data";

export const metadata: Metadata = { title: "Health Dashboard" };

export default function DashboardPage() {
  return (
    <OverviewView
      earlyWarning={
        <Suspense fallback={null}>
          <EarlyWarningSlot />
        </Suspense>
      }
      // Not awaited: only the tiles and charts that show it wait for the data.
      data={loadOverview()}
    />
  );
}

/** The signed-in crew member's latest readings (same data and rules as the module pages). */
async function loadOverview(): Promise<OverviewData | null> {
  const current = await getCurrentUser();
  const crew = current && !current.user.mustChangePin ? activeCrew(current) : null;
  if (!crew) return null;
  const vitals = vitalsSummaryFor(crew.id, 7);
  return { vitals: { tile: vitals.tile, heartRateWeek: vitals.trends.heartRate.map((p) => p.value) } };
}
