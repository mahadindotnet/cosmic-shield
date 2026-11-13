import type { Metadata } from "next";
import { MindView, type MindPageData } from "@/components/cosmic-shield/views/mind";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { mindSummaryFor } from "@/lib/mind/data";
import { utcToday } from "@/lib/vitals/data";

export const metadata: Metadata = { title: "Mind" };

export default function Page() {
  // Started here and resolved inside the view's <Suspense> blocks (not awaited).
  return <MindView data={loadMind()} />;
}

/** The signed-in crew member's own check-ins (rules run on read). Flight surgeons see scores in Crew admin. */
async function loadMind(): Promise<MindPageData> {
  const current = await getCurrentUser();
  const crew = current && !current.user.mustChangePin ? activeCrew(current) : null;
  return { summary: crew ? mindSummaryFor(crew.id) : null, canEdit: crew !== null, today: utcToday() };
}
