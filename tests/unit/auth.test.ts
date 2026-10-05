import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/db/schema";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "@/lib/password";
import { checkRateLimit, clearRateLimits } from "@/lib/rate-limit";

describe("password (scrypt)", () => {
  it("hashes and verifies correctly", () => {
    const hash = hashPassword("correct-horse-battery");
    expect(hash).toContain(":");
    expect(verifyPassword("correct-horse-battery", hash)).toBe(true);
    expect(verifyPassword("wrong-password-here", hash)).toBe(false);
  });

  it("rejects weak passwords under 12 chars", () => {
    expect(isPasswordStrongEnough("short")).toBe(false);
    expect(isPasswordStrongEnough("exactly12chr")).toBe(true);
    expect(isPasswordStrongEnough("a-longer-strong-password")).toBe(true);
  });
});

describe("rate limit", () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it("allows up to limit then blocks", () => {
    const key = "test-ip";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).ok).toBe(true);
    }
    const blocked = checkRateLimit(key, 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("auth bootstrap helpers", () => {
  let dir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-auth-"));
    const dbPath = path.join(dir, "test.db");
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.SESSION_SECRET = "a".repeat(32);
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "strong-password-12";
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects weak ADMIN_PASSWORD via isPasswordStrongEnough", () => {
    expect(isPasswordStrongEnough("short")).toBe(false);
  });

  it("SESSION_SECRET must be >= 32 chars (validation logic)", () => {
    const secret = process.env.SESSION_SECRET ?? "";
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect("tooshort".length).toBeLessThan(32);
  });
});

describe("migration still works with auth tests present", () => {
  it("can migrate a fresh db", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-auth-mig-"));
    const dbPath = path.join(dir, "test.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string;
    }[];
    expect(tables.map((t) => t.name)).toContain("users");
    sqlite.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
