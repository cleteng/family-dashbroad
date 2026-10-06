import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getGoogleConnectionStatus } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/google → { connected, email?, configured }
 * Never returns tokens.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const status = getGoogleConnectionStatus(auth.session.userId);
  return NextResponse.json({
    connected: status.connected,
    configured: status.configured,
    ...(status.email ? { email: status.email } : {}),
  });
}
