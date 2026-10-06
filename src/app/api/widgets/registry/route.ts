import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { listWidgetConfigEntries } from "@/widgets/config-registry";

/**
 * GET /api/widgets/registry — list registered widgets (type, metadata, defaultConfig).
 * Single source: src/widgets/config-registry.ts
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const widgets = listWidgetConfigEntries().map((e) => ({
    type: e.type,
    metadata: e.metadata,
    defaultConfig: { ...e.defaultConfig },
  }));

  return NextResponse.json({ widgets });
}
