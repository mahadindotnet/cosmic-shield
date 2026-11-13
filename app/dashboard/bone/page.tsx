import type { Metadata } from "next";
import { BoneView, type BonePageData } from "@/components/cosmic-shield/views/bone";
import { utcToday } from "@/lib/alerts/data";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { boneSummaryFor } from "@/lib/bone/data";

export const metadata: Metadata = { title: "Bone Protection" };

export default function Page() {
  // Started here and resolved inside the view's <Suspense> blocks (not awaited).
  return <BoneView data={loadBone()} />;
}

/** The signed-in crew member's own logs, against their environment's exercise target. */
async function loadBone(): Promise<BonePageData> {
  const current = await getCurrentUser();
  const crew = current && !current.user.mustChangePin ? activeCrew(current) : null;
  return { summary: crew ? boneSummaryFor(crew) : null, canEdit: crew !== null, today: utcToday() };
}
