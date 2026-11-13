import type { Metadata } from "next";
import { Suspense } from "react";
import { EarlyWarningSlot } from "@/components/alerts/early-warning-slot";
import { OverviewView, type OverviewData } from "@/components/cosmic-shield/views/overview";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { activeAlertsFor } from "@/lib/alerts/active";
import { dashboardAlertSummary } from "@/lib/alerts/summary";
import { gamificationFor } from "@/lib/gamification/data";
import { boneSummaryFor } from "@/lib/bone/data";
import { mindSummaryFor } from "@/lib/mind/data";
import { radiationSummaryFor } from "@/lib/radiation/data";
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

/** The flight surgeon has no crew data of their own here (they review crew in Crew admin). */
const SURGEON_OVERVIEW: OverviewData = {
  viewer: "flight_surgeon",
  alerts: null,
  gamification: null,
  vitals: { tile: null, heartRateWeek: [] },
  sleep: { tile: null, week: [] },
  radiation: { tile: null, careerMsv: null, careerStatus: null },
  bone: { tile: null, exerciseWeek: [], dailyTargetMin: null },
  mind: { tile: null, moodFortnight: [], checkinsByDay: {} },
};

/**
 * The signed-in crew member's latest readings and active alerts (same data and
 * rules as the module pages; alerts from lib/alerts/active.ts). Never null once
 * loaded, so the view can tell "loading" from "no entries yet".
 */
async function loadOverview(): Promise<OverviewData> {
  const current = await getCurrentUser();
  const crew = current && !current.user.mustChangePin ? activeCrew(current) : null;
  if (!crew) return SURGEON_OVERVIEW;
  const vitals = vitalsSummaryFor(crew.id, 7);
  const sleep = sleepSummaryFor(crew.id, 7);
  const radiation = radiationSummaryFor(crew.id, 7);
  const mind = mindSummaryFor(crew.id, 14);
  const bone = boneSummaryFor(crew, 7);
  const lastNight = addDays(utcToday(), -1);
  return {
    viewer: "crew",
    alerts: dashboardAlertSummary(activeAlertsFor(crew.id)),
    gamification: gamificationFor(crew.id),
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
    radiation: {
      tile: radiation.tile && { metric: "Latest dose", ...radiation.tile },
      careerMsv: radiation.career.totalMsv,
      careerStatus: radiation.career.status,
    },
    bone: { tile: bone.tile, exerciseWeek: bone.trends.exercise.map((p) => p.value), dailyTargetMin: bone.dailyTargetMin },
    mind: {
      tile: mind.tile,
      moodFortnight: mind.trends.mood.map((p) => p.value),
      checkinsByDay: mind.checkinsByDay,
    },
  };
}
