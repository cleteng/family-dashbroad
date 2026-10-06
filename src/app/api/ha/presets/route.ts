import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { HA_PRESETS } from "@/lib/ha-presets";

export const dynamic = "force-dynamic";

/**
 * GET /api/ha/presets — list environment presets (Admin).
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  return NextResponse.json({
    presets: HA_PRESETS.map((p) => ({
      key: p.key,
      name: p.name,
      icon: p.icon,
      unit: p.unit,
      matchKeywords: [...p.matchKeywords],
    })),
  });
}
