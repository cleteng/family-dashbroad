/**
 * Google OAuth 2.0 for Tasks scope (TASK-019).
 * refresh_token encrypted in integrations table; access_token memory-cached.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations } from "@/db/schema/integrations";
import { decryptSecret, encryptSecret } from "@/lib/token-crypto";
import {
  GOOGLE_REVOKE_URL,
  GOOGLE_TASKS_SCOPE,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleClientConfig,
  isGoogleOAuthConfigured,
  refreshAccessToken,
  type TokenExchangeResult,
} from "@/lib/google-oauth-tokens";

export {
  GOOGLE_TASKS_SCOPE,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleClientConfig,
  isGoogleOAuthConfigured,
  refreshAccessToken,
  type TokenExchangeResult,
};

export const GOOGLE_INTEGRATION_TYPE = "google_tasks";

type StoredCredentials = {
  refresh_token: string;
  access_token?: string;
  expires_at?: number;
};

type AccessCacheEntry = {
  accessToken: string;
  expiresAt: number;
};

const accessCache = new Map<string, AccessCacheEntry>();

type FetchLike = typeof fetch;

function loadIntegrationRow(userId: string) {
  return db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.type, GOOGLE_INTEGRATION_TYPE),
      ),
    )
    .get();
}

function decryptCreds(encrypted: string | null): StoredCredentials | null {
  if (!encrypted) return null;
  try {
    const json = decryptSecret(encrypted);
    const parsed = JSON.parse(json) as Partial<StoredCredentials>;
    if (typeof parsed.refresh_token !== "string") return null;
    return {
      refresh_token: parsed.refresh_token,
      access_token:
        typeof parsed.access_token === "string"
          ? parsed.access_token
          : undefined,
      expires_at:
        typeof parsed.expires_at === "number" ? parsed.expires_at : undefined,
    };
  } catch {
    return null;
  }
}

export function saveGoogleTokens(
  userId: string,
  tokens: TokenExchangeResult,
  email?: string,
): void {
  let finalTokens = tokens;
  if (!finalTokens.refresh_token) {
    const existing = loadIntegrationRow(userId);
    const prev = decryptCreds(existing?.credentials ?? null);
    if (!prev?.refresh_token) {
      throw new Error("missing_refresh_token");
    }
    finalTokens = { ...finalTokens, refresh_token: prev.refresh_token };
  }

  const expiresAt = Date.now() + finalTokens.expires_in * 1000;
  const creds: StoredCredentials = {
    refresh_token: finalTokens.refresh_token!,
    access_token: finalTokens.access_token,
    expires_at: expiresAt,
  };
  const encrypted = encryptSecret(JSON.stringify(creds));
  const configJson = email ? JSON.stringify({ email }) : null;
  const now = new Date();
  const existing = loadIntegrationRow(userId);

  if (existing) {
    db.update(integrations)
      .set({
        credentials: encrypted,
        config: configJson ?? existing.config,
        isActive: true,
        updatedAt: now,
      })
      .where(eq(integrations.id, existing.id))
      .run();
  } else {
    db.insert(integrations)
      .values({
        id: crypto.randomUUID(),
        userId,
        type: GOOGLE_INTEGRATION_TYPE,
        name: "Google Tasks",
        config: configJson,
        credentials: encrypted,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  accessCache.set(userId, {
    accessToken: finalTokens.access_token,
    expiresAt,
  });
}

export type GoogleConnectionStatus = {
  connected: boolean;
  email?: string;
  configured: boolean;
};

export function getGoogleConnectionStatus(
  userId: string,
): GoogleConnectionStatus {
  const configured = isGoogleOAuthConfigured();
  const row = loadIntegrationRow(userId);
  if (!row || !row.isActive) {
    return { connected: false, configured };
  }
  const creds = decryptCreds(row.credentials);
  if (!creds?.refresh_token) {
    return { connected: false, configured };
  }
  let email: string | undefined;
  if (row.config) {
    try {
      const c = JSON.parse(row.config) as { email?: string };
      if (typeof c.email === "string") email = c.email;
    } catch {
      /* ignore */
    }
  }
  return { connected: true, email, configured };
}

export async function getValidAccessToken(
  userId: string,
  fetchImpl: FetchLike = fetch,
): Promise<string | null> {
  const cached = accessCache.get(userId);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const row = loadIntegrationRow(userId);
  if (!row?.isActive) return null;
  const creds = decryptCreds(row.credentials);
  if (!creds?.refresh_token) return null;

  if (
    creds.access_token &&
    creds.expires_at &&
    creds.expires_at > Date.now() + 60_000
  ) {
    accessCache.set(userId, {
      accessToken: creds.access_token,
      expiresAt: creds.expires_at,
    });
    return creds.access_token;
  }

  try {
    const refreshed = await refreshAccessToken(creds.refresh_token, fetchImpl);
    const expiresAt = Date.now() + refreshed.expires_in * 1000;
    const next: StoredCredentials = {
      refresh_token: creds.refresh_token,
      access_token: refreshed.access_token,
      expires_at: expiresAt,
    };
    db.update(integrations)
      .set({
        credentials: encryptSecret(JSON.stringify(next)),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, row.id))
      .run();
    accessCache.set(userId, {
      accessToken: refreshed.access_token,
      expiresAt,
    });
    return refreshed.access_token;
  } catch {
    return null;
  }
}

export async function revokeGoogleConnection(
  userId: string,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const row = loadIntegrationRow(userId);
  const creds = decryptCreds(row?.credentials ?? null);
  accessCache.delete(userId);

  if (creds?.refresh_token) {
    try {
      await fetchImpl(
        `${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(creds.refresh_token)}`,
        { method: "POST" },
      );
    } catch {
      // best-effort
    }
  }

  if (row) {
    db.delete(integrations).where(eq(integrations.id, row.id)).run();
  }
}

export function clearGoogleAccessCacheForTests(): void {
  accessCache.clear();
}
