import { NextRequest, NextResponse } from "next/server";
import { getOwnedDashboard } from "@/lib/dashboards";
import {
  LayoutValidationError,
  getLayout,
  saveLayout,
  saveLayoutSchema,
} from "@/lib/layouts";
import { requireAuth } from "@/lib/require-auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET — return all layout entries for this dashboard's widgets.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const dashboard = getOwnedDashboard(auth.session.userId, id);
  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const layouts = getLayout(dashboard.id);
  return NextResponse.json({ layouts });
}

/**
 * PUT — full-replace layout for this dashboard.
 * Body: { layouts: [{ widgetId, breakpoint, x, y, w, h }, ...] }
 * Entries not listed are deleted. Empty array clears all layouts.
 * Invalid entries reject the whole request (no partial write).
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const dashboard = getOwnedDashboard(auth.session.userId, id);
  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = saveLayoutSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const layouts = saveLayout(dashboard.id, parsed.data.layouts);
    return NextResponse.json({ layouts });
  } catch (err) {
    if (err instanceof LayoutValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
