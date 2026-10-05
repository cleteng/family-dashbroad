import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createWidgetSchema, updateWidgetSchema, WIDGET_TYPES } from "@/lib/widgets";

function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-wid-"));
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

function seedDashboard(sqlite: Database.Database, userId: string, name: string): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO dashboards (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, userId, name, null, now, now);
  return id;
}

describe("widget validation", () => {
  it("accepts MVP widget types", () => {
    for (const type of WIDGET_TYPES) {
      const r = createWidgetSchema.safeParse({ type });
      expect(r.success).toBe(true);
    }
  });

  it("rejects illegal type", () => {
    const r = createWidgetSchema.safeParse({ type: "rocket" });
    expect(r.success).toBe(false);
  });

  it("rejects config array or string", () => {
    expect(createWidgetSchema.safeParse({ type: "clock", config: [1, 2] }).success).toBe(false);
    expect(createWidgetSchema.safeParse({ type: "clock", config: "nope" }).success).toBe(false);
  });

  it("accepts config object and null", () => {
    const obj = createWidgetSchema.safeParse({
      type: "clock",
      config: { timezone: "America/Toronto" },
    });
    expect(obj.success).toBe(true);
    if (obj.success) {
      expect(obj.data.config).toEqual({ timezone: "America/Toronto" });
    }
    expect(createWidgetSchema.safeParse({ type: "clock", config: null }).success).toBe(true);
  });

  it("update requires at least one field", () => {
    expect(updateWidgetSchema.safeParse({}).success).toBe(false);
    expect(updateWidgetSchema.safeParse({ title: "Clock" }).success).toBe(true);
  });

  it("empty title becomes null", () => {
    const r = createWidgetSchema.safeParse({ type: "clock", title: "  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBeNull();
  });
});

describe("widget ownership and storage", () => {
  let ctx: ReturnType<typeof createTestDb>;
  let userA: string;
  let userB: string;
  let dashA: string;
  let dashB: string;

  beforeEach(() => {
    ctx = createTestDb();
    userA = seedUser(ctx.sqlite, "a@example.com");
    userB = seedUser(ctx.sqlite, "b@example.com");
    dashA = seedDashboard(ctx.sqlite, userA, "A");
    dashB = seedDashboard(ctx.sqlite, userB, "B");
  });

  afterEach(() => {
    ctx.sqlite.close();
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  it("list only returns widgets for that dashboard", () => {
    const now = Date.now();
    const wA = crypto.randomUUID();
    const wB = crypto.randomUUID();
    ctx.sqlite
      .prepare(
        "INSERT INTO widgets (id, dashboard_id, type, title, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(wA, dashA, "clock", null, null, now, now);
    ctx.sqlite
      .prepare(
        "INSERT INTO widgets (id, dashboard_id, type, title, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(wB, dashB, "weather", null, null, now, now);

    const rows = ctx.sqlite.prepare("SELECT id FROM widgets WHERE dashboard_id = ?").all(dashA) as {
      id: string;
    }[];
    expect(rows.map((r) => r.id)).toEqual([wA]);
  });

  it("widget not belonging to dashboard is not found", () => {
    const now = Date.now();
    const wB = crypto.randomUUID();
    ctx.sqlite
      .prepare(
        "INSERT INTO widgets (id, dashboard_id, type, title, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(wB, dashB, "clock", null, null, now, now);

    const cross = ctx.sqlite
      .prepare("SELECT id FROM widgets WHERE id = ? AND dashboard_id = ?")
      .get(wB, dashA);
    expect(cross).toBeUndefined();
  });

  it("config object round-trip via JSON string storage", () => {
    const now = Date.now();
    const id = crypto.randomUUID();
    const config = { timezone: "America/Toronto" };
    ctx.sqlite
      .prepare(
        "INSERT INTO widgets (id, dashboard_id, type, title, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(id, dashA, "clock", "Clock", JSON.stringify(config), now, now);

    const row = ctx.sqlite.prepare("SELECT config FROM widgets WHERE id = ?").get(id) as {
      config: string;
    };
    expect(JSON.parse(row.config)).toEqual(config);
  });

  it("create clock widget under owned dashboard (drizzle path)", () => {
    const now = new Date();
    const id = crypto.randomUUID();
    const config = { timezone: "America/Toronto" };
    ctx.db
      .insert(schema.widgets)
      .values({
        id,
        dashboardId: dashA,
        type: "clock",
        title: "Clock",
        config: JSON.stringify(config),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const row = ctx.db.select().from(schema.widgets).where(eq(schema.widgets.id, id)).get();
    expect(row?.type).toBe("clock");
    expect(JSON.parse(row!.config!)).toEqual(config);
  });
});
