import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { displayTokens } from "@/db/schema/display-tokens";
import { getOwnedDashboard } from "@/lib/dashboards";
import { setDisplayTokenActive } from "@/lib/display-tokens";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

type RouteContext = {
  params: Promise<{ id: string; tokenId: string }>;
};

const patchSchema = z.object({
  isActive: z.boolean(),
});

/**
 * PATCH — enable/disable a display token (minimal, for tests / future TASK-010).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id, tokenId } = await context.params;
  const dashboard = getOwnedDashboard(auth.session.userId, id);
  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const owned = db
    .select({ id: displayTokens.id })
    .from(displayTokens)
    .where(
      and(
        eq(displayTokens.id, tokenId),
        eq(displayTokens.dashboardId, dashboard.id),
      ),
    )
    .get();
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "isActive boolean required" },
      { status: 400 },
    );
  }

  setDisplayTokenActive(tokenId, parsed.data.isActive);
  return NextResponse.json({ ok: true, isActive: parsed.data.isActive });
}
