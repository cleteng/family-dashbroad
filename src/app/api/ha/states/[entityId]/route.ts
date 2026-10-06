import { NextRequest, NextResponse } from "next/server";
import { fetchHAEntityState } from "@/lib/home-assistant";

export const dynamic = "force-dynamic";

/**
 * GET /api/ha/states/[entityId]
 * Public (display board has no session). Token stays server-side.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ entityId: string }> },
) {
  const { entityId: raw } = await ctx.params;
  // Next may pass encoded segment; decode once
  let entityId = raw;
  try {
    entityId = decodeURIComponent(raw);
  } catch {
    entityId = raw;
  }

  if (!entityId || !entityId.trim()) {
    return NextResponse.json(
      { error: "not_found", message: "实体不存在" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await fetchHAEntityState(entityId.trim());

  if (!result.ok) {
    if (
      result.reason === "not_configured" ||
      result.reason === "unauthorized"
    ) {
      return NextResponse.json(
        { error: "ha_unavailable", message: "HA 未连接" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (result.reason === "not_found") {
      return NextResponse.json(
        { error: "not_found", message: "实体不存在" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "ha_error", message: "暂时无法获取" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      entityId: result.data.entityId,
      state: result.data.state,
      unit: result.data.unit,
      friendlyName: result.data.friendlyName,
      lastUpdated: result.data.lastUpdated,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
