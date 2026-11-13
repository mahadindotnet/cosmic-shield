import type { Metadata } from "next";
import { Suspense } from "react";
import { EarlyWarningSlot } from "@/components/alerts/early-warning-slot";
import { OverviewView, type OverviewData } from "@/components/cosmic-shield/views/overview";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { sleepSummaryFor } from "@/lib/sleep/data";
import { utcToday, vitalsSummaryFor } from "@/lib/vitals/data";
import { addDays, dayLabel } from "@/lib/vitals/summary";

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
  const sleep = sleepSummaryFor(crew.id, 7);
  const lastNight = addDays(utcToday(), -1);
  return {
    vitals: { tile: vitals.tile, heartRateWeek: vitals.trends.heartRate.map((p) => p.value) },
    sleep: {
      tile: sleep.tile && {
        metric: sleep.tile.night === lastNight ? "Sleep last night" : `Sleep, night of ${dayLabel(sleep.tile.night)}`,
        value: sleep.tile.value,
        unit: sleep.tile.unit,
        status: sleep.tile.status,
      },
      week: sleep.trends.sleepHours.map((p, i, all) => ({ label: i === all.length - 1 ? "Last" : `${all.length - 1 - i}n`, value: p.value })),
    },
  };
}
