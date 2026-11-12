import { NextResponse } from "next/server";
import { withApiUser } from "@/lib/auth/api";
import { listUsers } from "@/lib/auth/users";
import { getCrewList } from "@/lib/services/crew-service";

/** Crew list: a flight surgeon sees everyone; crew see only themselves. */
export async function GET() {
  return withApiUser((current) => {
    const accounts = listUsers().filter((u) => u.role === "crew");
    const visible =
      current.user.role === "flight_surgeon"
        ? accounts
        : accounts.filter((u) => u.id === current.user.id);
    const profiles = new Map(getCrewList().map((c) => [c.id, c]));
    return NextResponse.json({
      crew: visible.map((u) => ({
        crewId: u.crewId,
        name: u.displayName,
        title: u.title,
        ...(u.profileId ? { summary: profiles.get(u.profileId) ?? null } : {}),
      })),
    });
  });
}
