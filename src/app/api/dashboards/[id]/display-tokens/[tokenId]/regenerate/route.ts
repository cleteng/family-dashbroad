import { NextRequest, NextResponse } from "next/server";
import { getOwnedDashboard } from "@/lib/dashboards";
import { regenerateDisplayToken } from "@/lib/display-tokens";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; tokenId: string }>;
};

/**
 * POST — regenerate token plaintext; old hash invalidated.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id, tokenId } = await context.params;
  const dashboard = getOwnedDashboard(auth.session.userId, id);
  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = regenerateDisplayToken(dashboard.id, tokenId);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      token: result.token,
      displayUrl: result.displayUrl,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
