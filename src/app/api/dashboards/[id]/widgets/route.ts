import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getOwnedDashboard } from "@/lib/dashboards";
import { requireAuth } from "@/lib/require-auth";
import { createWidget, createWidgetSchema, listWidgets } from "@/lib/widgets";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const dashboard = getOwnedDashboard(auth.session.userId, id);
  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const widgets = listWidgets(dashboard.id);
  return NextResponse.json({ widgets });
}

export async function POST(request: NextRequest, context: RouteContext) {
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

  const parsed = createWidgetSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const widget = createWidget(dashboard.id, parsed.data);
    return NextResponse.json({ widget }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues.map((i) => i.message).join("; ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw err;
  }
}
