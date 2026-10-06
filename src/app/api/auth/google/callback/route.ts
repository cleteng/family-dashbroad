import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { exchangeCodeForTokens, saveGoogleTokens } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/callback — exchange code, store tokens, redirect Admin.
 */
export async function GET(req: NextRequest) {
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  const settingsPath = `${appUrl}/admin/settings/google`;

  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.redirect(
      `${appUrl}/login?next=${encodeURIComponent("/admin/settings/google")}`,
    );
  }

  const sp = req.nextUrl.searchParams;
  const error = sp.get("error");
  if (error) {
    return NextResponse.redirect(
      `${settingsPath}?error=${encodeURIComponent("授权被取消或失败")}`,
    );
  }

  const code = sp.get("code");
  const state = sp.get("state");
  const expected = (session as { googleOAuthState?: string }).googleOAuthState;

  // Clear state immediately
  delete (session as { googleOAuthState?: string }).googleOAuthState;
  await session.save();

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(
      `${settingsPath}?error=${encodeURIComponent("无效的授权请求")}`,
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    saveGoogleTokens(session.userId, tokens);
    return NextResponse.redirect(`${settingsPath}?connected=1`);
  } catch {
    return NextResponse.redirect(
      `${settingsPath}?error=${encodeURIComponent("连接失败")}`,
    );
  }
}
