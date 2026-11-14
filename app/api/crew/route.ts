import { NextResponse } from "next/server";
import { withApiUser } from "@/lib/auth/api";
import { listUsers } from "@/lib/auth/users";

/** Crew accounts: a flight surgeon sees everyone; crew see only themselves. No health data here (see /api/crew/[id]). */
export async function GET() {
  return withApiUser((current) => {
    const accounts = listUsers().filter((u) => u.role === "crew");
    const visible = current.user.role === "flight_surgeon" ? accounts : accounts.filter((u) => u.id === current.user.id);
    return NextResponse.json({
      crew: visible.map((u) => ({ crewId: u.crewId, name: u.displayName, title: u.title })),
    });
  });
}
