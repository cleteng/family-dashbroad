import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { testHAConnection } from "@/lib/home-assistant";

export const dynamic = "force-dynamic";

const testSchema = z.object({
  url: z.string().min(1),
  token: z.string().min(1),
});

/**
 * POST /api/settings/home-assistant/test
 * body: { url, token } → { connected, version? }
 * Failures always use generic messaging; token never echoed.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ connected: false, error: "连接失败" }, { status: 400 });
  }

  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ connected: false, error: "连接失败" }, { status: 400 });
  }

  const status = await testHAConnection(parsed.data.url, parsed.data.token);

  if (status.connected) {
    return NextResponse.json({
      connected: true,
      ...(status.version ? { version: status.version } : {}),
    });
  }

  return NextResponse.json({
    connected: false,
    error: "连接失败",
  });
}
