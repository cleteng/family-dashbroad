import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  CLOCK_TYPE,
  clockDefaultConfig,
} from "@/widgets/clock/config";

/**
 * GET /api/widgets/registry — list registered widgets (type, metadata, defaultConfig).
 * Does not expose renderer/editor implementations.
 *
 * Keep in sync with src/widgets/index.ts registrations.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const widgets = [
    {
      type: CLOCK_TYPE,
      metadata: {
        name: "时钟",
        description: "显示当前时间与日期",
      },
      defaultConfig: { ...clockDefaultConfig },
    },
  ];

  return NextResponse.json({ widgets });
}
