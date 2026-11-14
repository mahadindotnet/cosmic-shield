import { NextResponse } from "next/server";
import { withApiUser } from "@/lib/auth/api";
import { canViewCrew } from "@/lib/auth/dal";
import { findUserByCrewId } from "@/lib/auth/users";
import { crewSnapshot } from "@/lib/crew/snapshot";

/**
 * One crew member's latest module readings and active alerts, by crew ID
 * (e.g. CS-001), from the module tables (lib/crew/snapshot.ts). Crew may only
 * read their own; the flight surgeon may read anyone. No private text.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiUser(async (current) => {
    const { id } = await ctx.params;
    const crewId = decodeURIComponent(id).toUpperCase();
    if (!canViewCrew(current, crewId)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const account = findUserByCrewId(crewId);
    if (account?.role !== "crew") return NextResponse.json({ error: "Crew not found" }, { status: 404 });
    return NextResponse.json(crewSnapshot(account), { headers: { "Cache-Control": "private, no-store" } });
  });
}
