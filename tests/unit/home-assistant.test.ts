import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getHAConfig,
  getHACredentialsForServer,
  normalizeHAUrl,
  resetHARuntimeConfigForTests,
  saveHAConfig,
  setHAConfigFilePathForTests,
  testHAConnection,
} from "@/lib/home-assistant";

describe("normalizeHAUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeHAUrl("http://ha.local:8123/")).toBe(
      "http://ha.local:8123",
    );
    expect(normalizeHAUrl("  https://ha.example.com/// ")).toBe(
      "https://ha.example.com",
    );
  });
});

describe("testHAConnection", () => {
  it("token correct → connected with version", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify({ version: "2026.10.1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const status = await testHAConnection(
      "http://ha.local:8123",
      "valid-token",
      fetchMock,
    );
    expect(status.connected).toBe(true);
    expect(status.version).toBe("2026.10.1");
    expect(status.error).toBeUndefined();
  });

  it("token wrong → connected false, no detail leak", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      });
    const status = await testHAConnection(
      "http://ha.local:8123",
      "bad-token",
      fetchMock,
    );
    expect(status.connected).toBe(false);
    expect(status.error).toBe("连接失败");
    // Must not echo token or HA body details
    expect(JSON.stringify(status)).not.toContain("bad-token");
    expect(JSON.stringify(status)).not.toContain("Unauthorized");
  });

  it("URL unreachable → connected false", async () => {
    const fetchMock: typeof fetch = async () => {
      throw new Error("fetch failed: ECONNREFUSED");
    };
    const status = await testHAConnection(
      "http://127.0.0.1:1",
      "any-token",
      fetchMock,
    );
    expect(status.connected).toBe(false);
    expect(status.error).toBe("连接失败");
    expect(JSON.stringify(status)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(status)).not.toContain("any-token");
  });

  it("empty url/token → fail generically", async () => {
    const status = await testHAConnection("", "");
    expect(status.connected).toBe(false);
    expect(status.error).toBe("连接失败");
  });
});

describe("saveHAConfig / getHAConfig", () => {
  let tmpDir: string;
  let prevUrl: string | undefined;
  let prevToken: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-ha-"));
    setHAConfigFilePathForTests(path.join(tmpDir, "ha-config.json"));
    resetHARuntimeConfigForTests();
    prevUrl = process.env.HA_URL;
    prevToken = process.env.HA_TOKEN;
    delete process.env.HA_URL;
    delete process.env.HA_TOKEN;
  });

  afterEach(() => {
    setHAConfigFilePathForTests(null);
    resetHARuntimeConfigForTests();
    if (prevUrl === undefined) delete process.env.HA_URL;
    else process.env.HA_URL = prevUrl;
    if (prevToken === undefined) delete process.env.HA_TOKEN;
    else process.env.HA_TOKEN = prevToken;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("after save, hasToken true but no token plaintext in getHAConfig", () => {
    saveHAConfig("http://ha.local:8123", "super-secret-token");
    const pub = getHAConfig();
    expect(pub.url).toBe("http://ha.local:8123");
    expect(pub.hasToken).toBe(true);
    expect(pub).not.toHaveProperty("token");
    expect(JSON.stringify(pub)).not.toContain("super-secret-token");

    // Server-side helper can read credentials
    const creds = getHACredentialsForServer();
    expect(creds?.token).toBe("super-secret-token");
  });

  it("empty token on save keeps previous token", () => {
    saveHAConfig("http://ha.local:8123", "first-token");
    saveHAConfig("http://ha.local:8123/new", "");
    expect(getHAConfig().url).toBe("http://ha.local:8123/new");
    expect(getHACredentialsForServer()?.token).toBe("first-token");
  });

  it("reads from env when no file", () => {
    process.env.HA_URL = "http://env-ha:8123";
    process.env.HA_TOKEN = "env-token";
    resetHARuntimeConfigForTests();
    setHAConfigFilePathForTests(path.join(tmpDir, "missing.json"));
    const pub = getHAConfig();
    expect(pub.url).toBe("http://env-ha:8123");
    expect(pub.hasToken).toBe(true);
    expect(JSON.stringify(pub)).not.toContain("env-token");
  });
});
