/**
 * Pure Google OAuth token helpers (no DB). Used by google-oauth.ts and unit tests.
 */

export const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

type FetchLike = typeof fetch;

export function getGoogleClientConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) return null;

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() || `${appUrl}/api/auth/google/callback`;

  return { clientId, clientSecret, redirectUri };
}

export function isGoogleOAuthConfigured(): boolean {
  return getGoogleClientConfig() !== null;
}

export function buildGoogleAuthUrl(state: string): string | null {
  const cfg = getGoogleClientConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: GOOGLE_TASKS_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type TokenExchangeResult = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
};

export async function exchangeCodeForTokens(
  code: string,
  fetchImpl: FetchLike = fetch,
): Promise<TokenExchangeResult> {
  const cfg = getGoogleClientConfig();
  if (!cfg) throw new Error("Google OAuth not configured");

  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!res.ok) {
    throw new Error("token_exchange_failed");
  }
  const body = (await res.json()) as Partial<TokenExchangeResult>;
  if (typeof body.access_token !== "string" || typeof body.expires_in !== "number") {
    throw new Error("token_exchange_invalid");
  }
  return {
    access_token: body.access_token,
    refresh_token: typeof body.refresh_token === "string" ? body.refresh_token : undefined,
    expires_in: body.expires_in,
    token_type: body.token_type,
    scope: body.scope,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ access_token: string; expires_in: number }> {
  const cfg = getGoogleClientConfig();
  if (!cfg) throw new Error("Google OAuth not configured");

  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    throw new Error("token_refresh_failed");
  }
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (typeof body.access_token !== "string" || typeof body.expires_in !== "number") {
    throw new Error("token_refresh_invalid");
  }
  return { access_token: body.access_token, expires_in: body.expires_in };
}
