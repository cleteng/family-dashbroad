import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { listHASensorEntities } from "@/lib/home-assistant";

export const dynamic = "force-dynamic";

/**
 * GET /api/ha/states — list sensor / binary_sensor entities (Admin editor).
 * Auth required. Never returns HA token.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const result = await listHASensorEntities();
  if (!result.ok) {
    if (result.reason === "not_configured" || result.reason === "unauthorized") {
      return NextResponse.json(
        { error: "ha_unavailable", message: "HA 未连接", entities: [] },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "ha_error", message: "暂时无法获取", entities: [] },
      { status: 502 },
    );
  }

  return NextResponse.json({ entities: result.data });
}
