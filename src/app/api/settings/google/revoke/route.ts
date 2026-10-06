import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { revokeGoogleConnection } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

/**
 * POST /api/settings/google/revoke — revoke + delete local tokens.
 */
export async function POST() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  await revokeGoogleConnection(auth.session.userId);
  return NextResponse.json({ connected: false, ok: true });
}
