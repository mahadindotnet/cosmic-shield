import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { AdminPanel } from "@/components/auth/admin-panel";
import { CrewPicker, CrewReview } from "@/components/auth/crew-review";
import { CrewMindReview } from "@/components/admin/crew-mind-review";
import { mindSummaryForReview } from "@/lib/mind/data";
import { escalationsForReview } from "@/lib/mind/safety-escalation";
import { requireRole } from "@/lib/auth/dal";
import { auditFor, findUserById, listUsers, recentAudit } from "@/lib/auth/users";
import { crewSnapshot } from "@/lib/crew/snapshot";

export const metadata: Metadata = { title: "Crew admin" };

export default function AdminPage({ searchParams }: PageProps<"/dashboard/admin">) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="console-label">Flight surgeon</p>
        <h1 className="text-halo mt-1 font-heading text-2xl font-semibold text-foreground">Crew admin</h1>
        <p className="text-halo mt-1 text-sm text-muted-foreground">
          Review a crew member, assign crew IDs, reset PINs, unlock accounts and check sign-in activity.
        </p>
      </div>
      <Suspense fallback={<div className="glass-panel h-64 animate-pulse rounded-2xl" aria-busy="true" />}>
        <AdminContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminContent({ searchParams }: { searchParams: PageProps<"/dashboard/admin">["searchParams"] }) {
  // Server-side role check (proxy.ts also blocks crew from this route).
  const { user: viewer } = await requireRole("flight_surgeon", { onDenied: "redirect" });
  await connection();
  const { crew } = await searchParams;
  const data = loadAdminData(typeof crew === "string" ? crew.toUpperCase() : null);
  const review = data.selected
    ? {
        account: data.selected.account,
        // Real entries only: every module's latest reading and the active alerts.
        snapshot: crewSnapshot(findUserById(data.selected.userId)!),
        activity: auditFor(data.selected.account.crewId),
        // Flight surgeon only (enforced again inside both functions).
        mind: mindSummaryForReview(viewer, data.selected.userId),
        escalations: escalationsForReview(viewer, data.selected.userId),
      }
    : null;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="picker-heading" className="flex flex-col gap-4">
        <h2 id="picker-heading" className="text-halo font-heading text-lg font-medium text-foreground">
          Crew member
        </h2>
        <CrewPicker crew={data.picker} selected={data.selected?.account.crewId ?? null} />
        {review && <CrewReview account={review.account} snapshot={review.snapshot} activity={review.activity} />}
        {review && <CrewMindReview crewId={review.account.crewId} mind={review.mind} escalations={review.escalations} />}
      </section>

      <AdminPanel users={data.users} audit={data.audit} now={data.now} />
    </div>
  );
}

/**
 * Accounts without PIN hashes, recent audit rows, the time used for lock
 * status, and the crew member chosen in the picker (default: the first).
 */
function loadAdminData(requested: string | null) {
  const now = Date.now();
  const rows = listUsers();
  const users = rows.map((u) => ({
    id: u.id,
    crewId: u.crewId,
    displayName: u.displayName,
    title: u.title,
    role: u.role,
    failedAttempts: u.failedAttempts,
    lockedUntil: u.lockedUntil,
    mustChangePin: u.mustChangePin,
  }));
  const crew = rows.filter((u) => u.role === "crew");
  const isLocked = (u: (typeof rows)[number]) => u.lockedUntil !== null && u.lockedUntil > now;
  const chosen = crew.find((u) => u.crewId === requested) ?? crew[0] ?? null;

  return {
    now,
    users,
    audit: recentAudit(100),
    picker: crew.map((u) => ({ crewId: u.crewId, displayName: u.displayName, title: u.title, locked: isLocked(u) })),
    selected: chosen
      ? {
          userId: chosen.id,
          account: {
            crewId: chosen.crewId,
            displayName: chosen.displayName,
            title: chosen.title,
            locked: isLocked(chosen),
            failedAttempts: chosen.failedAttempts,
            mustChangePin: chosen.mustChangePin,
          },
        }
      : null,
  };
}
