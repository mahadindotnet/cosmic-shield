import "server-only";
import { NextResponse } from "next/server";
import { activeCrew, getApiUser, type CurrentUser } from "./dal";

/** Runs a route handler only for a signed-in user; otherwise 401. */
export async function withApiUser(handler: (current: CurrentUser) => Promise<Response> | Response) {
  const current = await getApiUser();
  if (!current) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return handler(current);
}

/**
 * The crew profile the caller may act on: their own (crew) or the one they
 * selected (flight surgeon). Never taken from the request body.
 */
export function activeProfileId(current: CurrentUser): string | null {
  return activeCrew(current)?.profileId ?? null;
}
