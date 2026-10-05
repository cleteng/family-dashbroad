import { NextRequest, NextResponse } from "next/server";
import { createDashboard, createDashboardSchema, listDashboards } from "@/lib/dashboards";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const dashboards = listDashboards(auth.session.userId);
  return NextResponse.json({ dashboards });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createDashboardSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const dashboard = createDashboard(auth.session.userId, parsed.data);
  return NextResponse.json({ dashboard }, { status: 201 });
}
