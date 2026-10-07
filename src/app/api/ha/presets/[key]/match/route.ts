import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getHAPreset, matchEntities } from "@/lib/ha-presets";
import { listHASensorEntities } from "@/lib/home-assistant";

export const dynamic = "force-dynamic";

/**
 * GET /api/ha/presets/[key]/match — entities matching preset keywords.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { key } = await ctx.params;
  const preset = getHAPreset(key);
  if (!preset) {
    return NextResponse.json({ error: "unknown_preset" }, { status: 404 });
  }

  const listed = await listHASensorEntities();
  if (!listed.ok) {
    if (listed.reason === "not_configured" || listed.reason === "unauthorized") {
      return NextResponse.json(
        {
          preset: { key: preset.key, name: preset.name },
          entities: [],
          error: "ha_unavailable",
          message: "HA 未连接",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        preset: { key: preset.key, name: preset.name },
        entities: [],
        error: "ha_error",
        message: "暂时无法获取",
      },
      { status: 502 },
    );
  }

  const entities = matchEntities(preset, listed.data);
  return NextResponse.json({
    preset: {
      key: preset.key,
      name: preset.name,
      icon: preset.icon,
      unit: preset.unit,
    },
    entities,
  });
}
