/**
 * Route protection (Next.js 16 proxy). Runs only on /dashboard/*, /change-pin
 * and the data API routes (see `config.matcher`); /login, its Server Actions,
 * /_next and static assets are never matched.
 *
 * This is the optimistic check (signed cookie only). Pages and Server Actions
 * re-check against the database with requireUser() / requireRole().
 */
import { NextResponse, type NextRequest } from "next/server";
import { ABSOLUTE_SESSION_MS, cookieSecure, SESSION_COOKIE } from "@/lib/auth/config";
import { readSessionToken, sessionStatus, signSession, type SessionStatus } from "@/lib/auth/session-token";

/** Re-sign the cookie at most this often to record activity. */
const REFRESH_EVERY_MS = 30_000;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const now = Date.now();

  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const status = session ? sessionStatus(session, now) : null;

  if (!session || status !== "active") {
    const response = isApi
      ? NextResponse.json({ error: status === "idle" ? "Session locked" : "Not signed in" }, { status: 401 })
      : NextResponse.redirect(loginUrl(request, status, pathname + search));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (!isApi) {
    if (session.mustChangePin && pathname !== "/change-pin") {
      return NextResponse.redirect(new URL("/change-pin", request.url));
    }
    if (pathname.startsWith("/dashboard/admin") && session.role !== "flight_surgeon") {
      return NextResponse.redirect(new URL("/dashboard?denied=admin", request.url));
    }
  } else if (session.mustChangePin) {
    return NextResponse.json({ error: "PIN change required" }, { status: 403 });
  }

  const response = NextResponse.next();
  // Sliding idle timer. Router prefetches are not user activity, so they don't count.
  const isPrefetch = request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch";
  if (!isPrefetch && now - session.lastActive > REFRESH_EVERY_MS) {
    response.cookies.set(SESSION_COOKIE, await signSession({ ...session, lastActive: now }), {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor((session.issuedAt + ABSOLUTE_SESSION_MS - now) / 1000),
    });
  }
  return response;
}

function loginUrl(request: NextRequest, status: SessionStatus | null, from: string) {
  const url = new URL("/login", request.url);
  if (status === "idle") url.searchParams.set("locked", "1");
  else if (from.startsWith("/dashboard")) url.searchParams.set("next", from);
  return url;
}

export const config = {
  matcher: ["/dashboard/:path*", "/change-pin", "/api/:path*"],
};
