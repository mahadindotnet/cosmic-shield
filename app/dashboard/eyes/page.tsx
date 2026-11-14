import type { Metadata } from "next";
import { EyesView, type EyesPageData } from "@/components/cosmic-shield/views/eyes";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { eyeSummaryFor } from "@/lib/eyes/data";

export const metadata: Metadata = { title: "Eyes" };

export default function Page() {
  // Started here and resolved inside the view's <Suspense> blocks (not awaited).
  return <EyesView data={loadEyes()} />;
}

/** The signed-in crew member's own screenings. */
async function loadEyes(): Promise<EyesPageData> {
  const current = await getCurrentUser();
  const crew = current && !current.user.mustChangePin ? activeCrew(current) : null;
  return { summary: crew ? eyeSummaryFor(crew.id) : null, canEdit: crew !== null };
}
