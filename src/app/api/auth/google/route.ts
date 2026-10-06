import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireAuth } from "@/lib/require-auth";
import { getSession } from "@/lib/session";
import {
  buildGoogleAuthUrl,
  isGoogleOAuthConfigured,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google — redirect to Google consent (auth required).
 * Stores CSRF state in session.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 503 },
    );
  }

  const state = randomBytes(24).toString("hex");
  const session = await getSession();
  // Store OAuth state on session for CSRF check
  (session as { googleOAuthState?: string }).googleOAuthState = state;
  await session.save();

  const url = buildGoogleAuthUrl(state);
  if (!url) {
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 503 },
    );
  }

  return NextResponse.redirect(url);
}
