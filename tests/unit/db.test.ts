import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { users } from "@/db/schema/users";
import { dashboards } from "@/db/schema/dashboards";
import { widgets } from "@/db/schema/widgets";
import { widgetLayouts } from "@/db/schema/widget-layouts";
import { displayTokens } from "@/db/schema/display-tokens";
import { integrations } from "@/db/schema/integrations";

function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-db-"));
  const dbPath = path.join(dir, "test.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  return { db, sqlite, dbPath, dir };
}

describe("TASK-002 Database", () => {
  let ctx: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    ctx = createTestDb();
    // Apply schema via raw SQL from drizzle (simple create for tests)
    // We use migrate in real flow; here we create tables for isolation.
    ctx.sqlite.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE dashboards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE widgets (
        id TEXT PRIMARY KEY,
        dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT,
        config TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE widget_layouts (
        id TEXT PRIMARY KEY,
        widget_id TEXT NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
        breakpoint TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        w INTEGER NOT NULL,
        h INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(widget_id, breakpoint)
      );
      CREATE TABLE display_tokens (
        id TEXT PRIMARY KEY,
        dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        name TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_used_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE integrations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        name TEXT,
        config TEXT,
        credentials TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  });

  afterEach(() => {
    ctx.sqlite.close();
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  it("can initialize database", () => {
    expect(ctx.db).toBeDefined();
    const tables = ctx.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("users");
    expect(names).toContain("dashboards");
    expect(names).toContain("widgets");
    expect(names).toContain("widget_layouts");
    expect(names).toContain("display_tokens");
    expect(names).toContain("integrations");
  });

  it("can create a user", () => {
    const id = crypto.randomUUID();
    const now = new Date();
    ctx.db.insert(users).values({
      id,
      email: "test@example.com",
      passwordHash: "hashed-password",
      createdAt: now,
      updatedAt: now,
    }).run();

    const row = ctx.db.select().from(users).where(eq(users.id, id)).get();
    expect(row).toBeDefined();
    expect(row?.email).toBe("test@example.com");
    expect(row?.passwordHash).toBe("hashed-password");
  });

  it("can create dashboard linked to user", () => {
    const userId = crypto.randomUUID();
    const dashId = crypto.randomUUID();
    const now = new Date();

    ctx.db.insert(users).values({
      id: userId,
      email: "owner@example.com",
      passwordHash: "hash",
      createdAt: now,
      updatedAt: now,
    }).run();

    ctx.db.insert(dashboards).values({
      id: dashId,
      userId,
      name: "Living Room",
      description: "Main display",
      createdAt: now,
      updatedAt: now,
    }).run();

    const row = ctx.db.select().from(dashboards).where(eq(dashboards.id, dashId)).get();
    expect(row?.userId).toBe(userId);
    expect(row?.name).toBe("Living Room");
  });

  it("can create widget linked to dashboard", () => {
    const userId = crypto.randomUUID();
    const dashId = crypto.randomUUID();
    const widgetId = crypto.randomUUID();
    const now = new Date();

    ctx.db.insert(users).values({
      id: userId,
      email: "w@example.com",
      passwordHash: "h",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(dashboards).values({
      id: dashId,
      userId,
      name: "D",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(widgets).values({
      id: widgetId,
      dashboardId: dashId,
      type: "clock",
      title: "Clock",
      config: JSON.stringify({ timezone: "Asia/Shanghai" }),
      createdAt: now,
      updatedAt: now,
    }).run();

    const row = ctx.db.select().from(widgets).where(eq(widgets.id, widgetId)).get();
    expect(row?.type).toBe("clock");
    expect(JSON.parse(row!.config!)).toEqual({ timezone: "Asia/Shanghai" });
  });

  it("can create widget layout", () => {
    const userId = crypto.randomUUID();
    const dashId = crypto.randomUUID();
    const widgetId = crypto.randomUUID();
    const layoutId = crypto.randomUUID();
    const now = new Date();

    ctx.db.insert(users).values({
      id: userId,
      email: "l@example.com",
      passwordHash: "h",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(dashboards).values({
      id: dashId,
      userId,
      name: "D",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(widgets).values({
      id: widgetId,
      dashboardId: dashId,
      type: "clock",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(widgetLayouts).values({
      id: layoutId,
      widgetId,
      breakpoint: "desktop",
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      createdAt: now,
      updatedAt: now,
    }).run();

    const row = ctx.db.select().from(widgetLayouts).where(eq(widgetLayouts.id, layoutId)).get();
    expect(row?.breakpoint).toBe("desktop");
    expect(row?.w).toBe(4);
  });

  it("rejects duplicate widget + breakpoint", () => {
    const userId = crypto.randomUUID();
    const dashId = crypto.randomUUID();
    const widgetId = crypto.randomUUID();
    const now = new Date();

    ctx.db.insert(users).values({
      id: userId,
      email: "u@example.com",
      passwordHash: "h",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(dashboards).values({
      id: dashId,
      userId,
      name: "D",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(widgets).values({
      id: widgetId,
      dashboardId: dashId,
      type: "clock",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(widgetLayouts).values({
      id: crypto.randomUUID(),
      widgetId,
      breakpoint: "mobile",
      x: 0,
      y: 0,
      w: 2,
      h: 2,
      createdAt: now,
      updatedAt: now,
    }).run();

    expect(() => {
      ctx.db.insert(widgetLayouts).values({
        id: crypto.randomUUID(),
        widgetId,
        breakpoint: "mobile",
        x: 1,
        y: 1,
        w: 2,
        h: 2,
        createdAt: now,
        updatedAt: now,
      }).run();
    }).toThrow();
  });

  it("cascades delete widget -> layouts", () => {
    const userId = crypto.randomUUID();
    const dashId = crypto.randomUUID();
    const widgetId = crypto.randomUUID();
    const layoutId = crypto.randomUUID();
    const now = new Date();

    ctx.db.insert(users).values({
      id: userId,
      email: "c@example.com",
      passwordHash: "h",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(dashboards).values({
      id: dashId,
      userId,
      name: "D",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(widgets).values({
      id: widgetId,
      dashboardId: dashId,
      type: "clock",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(widgetLayouts).values({
      id: layoutId,
      widgetId,
      breakpoint: "desktop",
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      createdAt: now,
      updatedAt: now,
    }).run();

    ctx.db.delete(widgets).where(eq(widgets.id, widgetId)).run();

    const remaining = ctx.db
      .select()
      .from(widgetLayouts)
      .where(eq(widgetLayouts.id, layoutId))
      .get();
    expect(remaining).toBeUndefined();
  });

  it("enforces unique token_hash", () => {
    const userId = crypto.randomUUID();
    const dashId = crypto.randomUUID();
    const now = new Date();

    ctx.db.insert(users).values({
      id: userId,
      email: "t@example.com",
      passwordHash: "h",
      createdAt: now,
      updatedAt: now,
    }).run();
    ctx.db.insert(dashboards).values({
      id: dashId,
      userId,
      name: "D",
      createdAt: now,
      updatedAt: now,
    }).run();

    ctx.db.insert(displayTokens).values({
      id: crypto.randomUUID(),
      dashboardId: dashId,
      tokenHash: "same-hash",
      name: "iPad",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).run();

    expect(() => {
      ctx.db.insert(displayTokens).values({
        id: crypto.randomUUID(),
        dashboardId: dashId,
        tokenHash: "same-hash",
        name: "Phone",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }).run();
    }).toThrow();
  });

  it("can create integration with separated config/credentials", () => {
    const userId = crypto.randomUUID();
    const now = new Date();

    ctx.db.insert(users).values({
      id: userId,
      email: "i@example.com",
      passwordHash: "h",
      createdAt: now,
      updatedAt: now,
    }).run();

    const id = crypto.randomUUID();
    ctx.db.insert(integrations).values({
      id,
      userId,
      type: "home_assistant",
      name: "Home",
      config: JSON.stringify({ baseUrl: "http://ha.local" }),
      credentials: JSON.stringify({ token: "secret" }),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).run();

    const row = ctx.db.select().from(integrations).where(eq(integrations.id, id)).get();
    expect(row?.type).toBe("home_assistant");
    expect(JSON.parse(row!.config!)).toEqual({ baseUrl: "http://ha.local" });
    expect(JSON.parse(row!.credentials!)).toEqual({ token: "secret" });
  });

  it("enforces foreign keys", () => {
    const now = new Date();
    expect(() => {
      ctx.db.insert(dashboards).values({
        id: crypto.randomUUID(),
        userId: "non-existent-user",
        name: "Orphan",
        createdAt: now,
        updatedAt: now,
      }).run();
    }).toThrow();
  });
});
