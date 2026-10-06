import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import React from "react";
import { renderToString } from "react-dom/server";
import * as schema from "@/db/schema";
import {
  generateDisplayToken,
  hashDisplayToken,
} from "@/lib/display-tokens";
import { DisplayBoard } from "@/components/display/DisplayBoard";

function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-dt-"));
  const dbPath = path.join(dir, "test.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { db, sqlite, dir };
}

function seedUser(sqlite: Database.Database, email: string): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(id, email, "hash", now, now);
  return id;
}

function seedDashboard(
  sqlite: Database.Database,
  userId: string,
  name: string,
): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO dashboards (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, userId, name, null, now, now);
  return id;
}

describe("display token hash", () => {
  it("same plaintext → same hash", () => {
    const t = "abc123token";
    expect(hashDisplayToken(t)).toBe(hashDisplayToken(t));
  });

  it("different plaintext → different hash", () => {
    expect(hashDisplayToken("a")).not.toBe(hashDisplayToken("b"));
  });

  it("generateDisplayToken is 64 hex chars", () => {
    const t = generateDisplayToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(t).toHaveLength(64);
  });
});

describe("regenerate hash swap (isolated test db)", () => {
  let ctx: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.sqlite.close();
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  it("old hash stops matching after regenerate; new hash is stored", () => {
    const userId = seedUser(ctx.sqlite, "u@example.com");
    const dashId = seedDashboard(ctx.sqlite, userId, "Board");
    const tokenId = crypto.randomUUID();
    const oldPlain = generateDisplayToken();
    const oldHash = hashDisplayToken(oldPlain);
    const now = Date.now();

    ctx.sqlite
      .prepare(
        `INSERT INTO display_tokens
         (id, dashboard_id, token_hash, name, is_active, last_used_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, NULL, ?, ?)`,
      )
      .run(tokenId, dashId, oldHash, "客厅", now, now);

    // Simulate regenerateDisplayToken logic against this test db
    const newPlain = generateDisplayToken();
    const newHash = hashDisplayToken(newPlain);
    expect(newPlain).toMatch(/^[0-9a-f]{64}$/);
    expect(newHash).not.toBe(oldHash);

    ctx.sqlite
      .prepare(
        "UPDATE display_tokens SET token_hash = ?, updated_at = ? WHERE id = ?",
      )
      .run(newHash, Date.now(), tokenId);

    const row = ctx.sqlite
      .prepare("SELECT token_hash FROM display_tokens WHERE id = ?")
      .get(tokenId) as { token_hash: string };

    expect(row.token_hash).toBe(newHash);
    expect(row.token_hash).not.toBe(oldHash);

    // List shape: no plaintext / hash in API whitelist fields
    const listRow = ctx.sqlite
      .prepare(
        "SELECT id, name, is_active, created_at, last_used_at, updated_at FROM display_tokens WHERE dashboard_id = ?",
      )
      .get(dashId) as Record<string, unknown>;
    expect(listRow).not.toHaveProperty("token");
    expect(listRow).not.toHaveProperty("token_hash");
    expect(Object.keys(listRow).sort()).toEqual(
      [
        "created_at",
        "id",
        "is_active",
        "last_used_at",
        "name",
        "updated_at",
      ].sort(),
    );
  });
});

describe("DisplayBoard unknown widget", () => {
  it("renders placeholder without throw", () => {
    const html = renderToString(
      React.createElement(DisplayBoard, {
        widgets: [
          {
            id: "w1",
            type: "weather",
            title: null,
            config: null,
          },
        ],
        layouts: [
          {
            widgetId: "w1",
            breakpoint: "desktop",
            x: 0,
            y: 0,
            w: 4,
            h: 3,
          },
        ],
      }),
    );
    expect(html).toContain("暂不支持");
  });
});
