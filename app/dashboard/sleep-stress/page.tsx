import type { Metadata } from "next";
import { SleepStressView, type SleepPageData } from "@/components/cosmic-shield/views/sleep-stress";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { sleepSummaryFor } from "@/lib/sleep/data";
import { addDays } from "@/lib/vitals/summary";
import { utcToday } from "@/lib/vitals/data";

export const metadata: Metadata = { title: "Sleep & Stress" };

export default function Page() {
  // Started here and resolved inside the view's <Suspense> blocks (not awaited).
  return <SleepStressView data={loadSleep()} />;
}

/** The signed-in crew member's own nights (rules run on read). Flight surgeons get none here. */
async function loadSleep(): Promise<SleepPageData> {
  const current = await getCurrentUser();
  const crew = current && !current.user.mustChangePin ? activeCrew(current) : null;
  const today = utcToday();
  return {
    summary: crew ? sleepSummaryFor(crew.id) : null,
    canEdit: crew !== null,
    today,
    lastNight: addDays(today, -1),
  };
}
