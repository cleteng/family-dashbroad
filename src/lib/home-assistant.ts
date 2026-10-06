/**
 * Home Assistant connection layer (TASK-016).
 * Credentials: env HA_URL / HA_TOKEN, optional runtime override file (not SQLite).
 * Token is never returned to clients or written to logs.
 */

import fs from "node:fs";
import path from "node:path";

export interface HAStatus {
  connected: boolean;
  version?: string;
  error?: string;
}

export interface HAPublicConfig {
  url: string;
  hasToken: boolean;
}

type StoredHAConfig = {
  url: string;
  token: string;
};

const REQUEST_TIMEOUT_MS = 8_000;
const GENERIC_FAIL = "连接失败";

/** In-memory override used after saveHAConfig (and in tests). */
let runtimeConfig: StoredHAConfig | null = null;

/** Override config file path for tests. */
let configFilePathOverride: string | null = null;

type FetchLike = typeof fetch;

function dataDir(): string {
  const dbUrl = process.env.DATABASE_URL ?? "file:./data/app.db";
  // file:./data/app.db → ./data
  const filePath = dbUrl.startsWith("file:")
    ? dbUrl.slice("file:".length)
    : dbUrl;
  return path.dirname(path.resolve(filePath));
}

export function getHAConfigFilePath(): string {
  if (configFilePathOverride) return configFilePathOverride;
  return path.join(dataDir(), "ha-config.json");
}

/** Test helper: point config file at a temp path; pass null to reset. */
export function setHAConfigFilePathForTests(p: string | null): void {
  configFilePathOverride = p;
}

/** Test helper: clear in-memory runtime config. */
export function resetHARuntimeConfigForTests(): void {
  runtimeConfig = null;
}

function readFileConfig(): StoredHAConfig | null {
  try {
    const fp = getHAConfigFilePath();
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredHAConfig>;
    if (typeof parsed.url === "string" && typeof parsed.token === "string") {
      return { url: parsed.url.trim(), token: parsed.token };
    }
  } catch {
    // corrupt / unreadable — treat as missing
  }
  return null;
}

function resolveStored(): StoredHAConfig {
  if (runtimeConfig) {
    return { url: runtimeConfig.url, token: runtimeConfig.token };
  }
  const file = readFileConfig();
  if (file) return file;
  return {
    url: (process.env.HA_URL ?? "").trim(),
    token: (process.env.HA_TOKEN ?? "").trim(),
  };
}

/** Normalize HA base URL: trim, remove trailing slash. */
export function normalizeHAUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Public config for Admin UI — never includes token plaintext.
 */
export function getHAConfig(): HAPublicConfig {
  const stored = resolveStored();
  return {
    url: stored.url,
    hasToken: stored.token.length > 0,
  };
}

/**
 * Persist URL + token to runtime + data/ha-config.json (not the SQLite DB).
 * Empty token string keeps the existing token (so UI can save URL-only).
 */
export function saveHAConfig(url: string, token: string): void {
  const normalizedUrl = normalizeHAUrl(url);
  const existing = resolveStored();
  const nextToken = token.trim().length > 0 ? token.trim() : existing.token;
  const next: StoredHAConfig = {
    url: normalizedUrl,
    token: nextToken,
  };
  runtimeConfig = next;

  const fp = getHAConfigFilePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  // Write with restrictive mode when possible
  fs.writeFileSync(fp, JSON.stringify(next, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}

/**
 * Probe HA: GET {url}/api/config with Bearer token.
 * On any failure returns connected:false and a generic error (no detail leak).
 */
export async function testHAConnection(
  url: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<HAStatus> {
  const base = normalizeHAUrl(url);
  if (!base || !token.trim()) {
    return { connected: false, error: GENERIC_FAIL };
  }

  // Reject obviously non-http(s) schemes early without leaking token
  if (!/^https?:\/\//i.test(base)) {
    return { connected: false, error: GENERIC_FAIL };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetchImpl(`${base}/api/config`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return { connected: false, error: GENERIC_FAIL };
    }

    let version: string | undefined;
    try {
      const body = (await res.json()) as { version?: unknown };
      if (typeof body.version === "string" && body.version.length > 0) {
        version = body.version;
      }
    } catch {
      // body parse fail → still treat as connected if HTTP ok
    }

    return { connected: true, version };
  } catch {
    return { connected: false, error: GENERIC_FAIL };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Test using currently saved credentials.
 */
export async function testSavedHAConnection(
  fetchImpl: FetchLike = fetch,
): Promise<HAStatus> {
  const stored = resolveStored();
  if (!stored.url || !stored.token) {
    return { connected: false, error: GENERIC_FAIL };
  }
  return testHAConnection(stored.url, stored.token, fetchImpl);
}

/** Internal: resolve token for server-side HA calls (widgets later). Never expose via API. */
export function getHACredentialsForServer(): {
  url: string;
  token: string;
} | null {
  const stored = resolveStored();
  if (!stored.url || !stored.token) return null;
  return { url: stored.url, token: stored.token };
}
