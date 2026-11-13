import { NextResponse, type NextRequest } from "next/server";
import { clearSession, forgetCrewId } from "@/lib/auth/session";

/**
 * Stale session: the cookie is validly signed but its user no longer exists
 * (deleted, or the database was reseeded). Clear it and the remembered crew
 * ID, then go to sign-in. Pages can't set cookies while rendering, so they
 * redirect here (lib/auth/dal.ts STALE_SESSION_PATH). Outside the proxy's
 * matcher, so it always runs.
 */
export async function GET(request: NextRequest) {
  await clearSession();
  await forgetCrewId();
  return NextResponse.redirect(new URL("/login?stale=1", request.url));
}
