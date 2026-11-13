import type { Metadata } from "next";
import { GiView, type GiPageData } from "@/components/cosmic-shield/views/gi";
import { utcToday } from "@/lib/alerts/data";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { giSummaryFor } from "@/lib/gi/data";

export const metadata: Metadata = { title: "GI" };

export default function Page() {
  // Started here and resolved inside the view's <Suspense> blocks (not awaited).
  return <GiView data={loadGi()} />;
}

/** The signed-in crew member's own entries. */
async function loadGi(): Promise<GiPageData> {
  const current = await getCurrentUser();
  const crew = current && !current.user.mustChangePin ? activeCrew(current) : null;
  return { summary: crew ? giSummaryFor(crew.id) : null, canEdit: crew !== null, today: utcToday() };
}
