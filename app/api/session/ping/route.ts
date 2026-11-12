import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/dal";

/**
 * Activity heartbeat. The idle-lock component calls this while the user is
 * active; proxy.ts refreshes the session's idle timer on the way through.
 */
export async function POST() {
  const current = await getApiUser();
  if (!current)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return new NextResponse(null, { status: 204 });
}
