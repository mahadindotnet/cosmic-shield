import type { Metadata } from "next";
import { VitalsView, type VitalsPageData } from "@/components/cosmic-shield/views/vitals";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { glucoseCrewReference, vitalsSummaryFor } from "@/lib/vitals/data";

export const metadata: Metadata = { title: "Vitals" };

export default function Page() {
  // Started here and resolved inside the view's <Suspense> blocks (not awaited),
  // so the page frame and form render at once and only the data streams in.
  return <VitalsView data={loadVitals()} />;
}

/**
 * The signed-in crew member's own vitals (rules run on read). Flight surgeons
 * get none here (view-only; they review crew in Crew admin). proxy.ts already
 * sends signed-out visitors to /login.
 */
async function loadVitals(): Promise<VitalsPageData> {
  const current = await getCurrentUser();
  const crew = current && !current.user.mustChangePin ? activeCrew(current) : null;
  return {
    summary: crew ? vitalsSummaryFor(crew.id) : null,
    canEdit: crew !== null,
    glucoseRef: glucoseCrewReference(),
  };
}
