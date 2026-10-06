import { NextRequest, NextResponse } from "next/server";
import { getOwnedDashboard } from "@/lib/dashboards";
import {
  createDisplayTokenForDashboard,
  createDisplayTokenSchema,
} from "@/lib/display-tokens";
import { requireAuth } from "@/lib/require-auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST — create a display token for this dashboard.
 * Plain token is returned once; only SHA-256 hash is stored.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const dashboard = getOwnedDashboard(auth.session.userId, id);
  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createDisplayTokenSchema.safeParse(body ?? {});
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const result = createDisplayTokenForDashboard(
    dashboard.id,
    parsed.data.name ?? null,
  );

  return NextResponse.json(
    {
      id: result.id,
      token: result.token,
      name: result.name,
      displayUrl: result.displayUrl,
    },
    { status: 201 },
  );
}
