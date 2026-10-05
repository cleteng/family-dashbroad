import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * Protect /admin/* paths. Display routes are intentionally NOT matched.
 * Session is read from the encrypted cookie; missing/invalid → redirect to login.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Misconfiguration: block admin rather than open access
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await getIronSession<SessionData>(request, response, {
    password: secret,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  });

  if (!session.isLoggedIn || !session.userId) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
