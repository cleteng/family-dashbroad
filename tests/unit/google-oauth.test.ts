import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("token-crypto", () => {
  const prevSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars!!";
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = prevSecret;
  });

  it("round-trips encrypt/decrypt", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/token-crypto");
    const plain = JSON.stringify({ refresh_token: "rt-secret-value" });
    const enc = encryptSecret(plain);
    expect(enc).not.toContain("rt-secret-value");
    expect(decryptSecret(enc)).toBe(plain);
  });
});

describe("google-oauth pure helpers", () => {
  const prev = {
    id: process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_CLIENT_SECRET,
    app: process.env.APP_URL,
  };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.APP_URL = "http://localhost:3000";
  });

  afterEach(() => {
    if (prev.id === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = prev.id;
    if (prev.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = prev.secret;
    if (prev.app === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prev.app;
  });

  it("buildGoogleAuthUrl includes tasks scope and state", async () => {
    const { buildGoogleAuthUrl, GOOGLE_TASKS_SCOPE } = await import("@/lib/google-oauth-tokens");
    const url = buildGoogleAuthUrl("csrf-state-abc");
    expect(url).toBeTruthy();
    const u = new URL(url!);
    expect(u.searchParams.get("state")).toBe("csrf-state-abc");
    expect(u.searchParams.get("scope")).toBe(GOOGLE_TASKS_SCOPE);
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("client_id")).toBe("test-client-id");
  });

  it("exchangeCodeForTokens posts code and returns tokens", async () => {
    const { exchangeCodeForTokens } = await import("@/lib/google-oauth-tokens");
    const fetchMock: typeof fetch = async (_url, init) => {
      const body = String((init as RequestInit)?.body ?? "");
      expect(body).toContain("code=auth-code-1");
      expect(body).toContain("grant_type=authorization_code");
      return new Response(
        JSON.stringify({
          access_token: "access-xyz",
          refresh_token: "refresh-xyz",
          expires_in: 3600,
          token_type: "Bearer",
        }),
        { status: 200 },
      );
    };
    const tokens = await exchangeCodeForTokens("auth-code-1", fetchMock);
    expect(tokens.access_token).toBe("access-xyz");
    expect(tokens.refresh_token).toBe("refresh-xyz");
    expect(tokens.expires_in).toBe(3600);
  });

  it("refreshAccessToken returns new access token", async () => {
    const { refreshAccessToken } = await import("@/lib/google-oauth-tokens");
    const fetchMock: typeof fetch = async (_url, init) => {
      const body = String((init as RequestInit)?.body ?? "");
      expect(body).toContain("grant_type=refresh_token");
      expect(body).toContain("refresh_token=rt-old");
      return new Response(JSON.stringify({ access_token: "access-new", expires_in: 1800 }), {
        status: 200,
      });
    };
    const r = await refreshAccessToken("rt-old", fetchMock);
    expect(r.access_token).toBe("access-new");
    expect(r.expires_in).toBe(1800);
  });

  it("isGoogleOAuthConfigured reflects env", async () => {
    const { isGoogleOAuthConfigured } = await import("@/lib/google-oauth-tokens");
    expect(isGoogleOAuthConfigured()).toBe(true);
    delete process.env.GOOGLE_CLIENT_ID;
    // re-import won't clear module; function reads env live
    expect(isGoogleOAuthConfigured()).toBe(false);
  });
});
