import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getHAConfig, saveHAConfig, testSavedHAConnection } from "@/lib/home-assistant";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  url: z.string().min(1),
  /** Empty string = keep existing token. */
  token: z.string().optional().default(""),
});

/**
 * GET /api/settings/home-assistant
 * → { url, hasToken, connected, version? }
 * Never returns token plaintext.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const cfg = getHAConfig();
  let connected = false;
  let version: string | undefined;

  if (cfg.url && cfg.hasToken) {
    const status = await testSavedHAConnection();
    connected = status.connected;
    version = status.version;
  }

  return NextResponse.json({
    url: cfg.url,
    hasToken: cfg.hasToken,
    connected,
    ...(version ? { version } : {}),
  });
}

/**
 * POST /api/settings/home-assistant
 * body: { url, token? } → save, then return public status
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  saveHAConfig(parsed.data.url, parsed.data.token ?? "");

  const cfg = getHAConfig();
  return NextResponse.json({
    url: cfg.url,
    hasToken: cfg.hasToken,
    ok: true,
  });
}
