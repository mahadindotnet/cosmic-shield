import { NextResponse } from "next/server";
import { withApiUser } from "@/lib/auth/api";
import { canViewCrew } from "@/lib/auth/dal";
import { findUserByCrewId } from "@/lib/auth/users";
import { getCrewDashboardWithLogs } from "@/lib/services/crew-service";

/** One crew member's data, by crew ID (e.g. CS-001). Crew may only read their own. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiUser(async (current) => {
    const { id } = await ctx.params;
    const crewId = decodeURIComponent(id).toUpperCase();
    if (!canViewCrew(current, crewId))
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });

    const account = findUserByCrewId(crewId);
    const payload =
      account?.role === "crew" && account.profileId
        ? await getCrewDashboardWithLogs(account.profileId)
        : null;
    if (!payload)
      return NextResponse.json({ error: "Crew not found" }, { status: 404 });
    return NextResponse.json({ ...payload, crewId: account!.crewId });
  });
}
