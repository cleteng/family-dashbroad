import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
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

  // Apply real Drizzle migration files
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  migrate(db, { migrationsFolder });

  return { db, sqlite, dbPath, dir };
}

describe("TASK-002 Database", () => {
  let ctx: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.sqlite.close();
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  it("applies Drizzle migration and creates all tables", () => {
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

  it("migration creates CHECK constraints on widget_layouts", () => {
    const sql = ctx.sqlite
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='widget_layouts'")
      .get() as { sql: string };
    expect(sql.sql).toContain("CHECK");
    expect(sql.sql).toContain("CHECK(`widget_layouts`.`x` >= 0)");
    expect(sql.sql).toContain("CHECK(`widget_layouts`.`y` >= 0)");
    expect(sql.sql).toContain("CHECK(`widget_layouts`.`w` > 0)");
    expect(sql.sql).toContain("CHECK(`widget_layouts`.`h` > 0)");
  });

  it("can create a user", () => {
    const id = crypto.randomUUID();
    const now = new Date();
    ctx.db
      .insert(users)
      .values({
        id,
        email: "test@example.com",
        passwordHash: "hashed-password",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const row = ctx.db.select().from(users).where(eq(users.id, id)).get();
    expect(row).toBeDefined();
    expect(row?.email).toBe("test@example.com");
    expect(row?.passwordHash).toBe("hashed-password");
  });

  it("can create dashboard linked to user", () => {
    const userId = crypto.randomUUID();
    const dashId = crypto.randomUUID();
    const now = new Date();

    ctx.db
      .insert(users)
      .values({
        id: userId,
        email: "owner@example.com",
        passwordHash: "hash",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    ctx.db
      .insert(dashboards)
      .values({
        id: dashId,
        userId,
        name: "Living Room",
        description: "Main display",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const row = ctx.db.select().from(dashboards).where(eq(dashboards.id, dashId)).get();
    expect(row?.userId).toBe(userId);
    expect(row?.name).toBe("Living Room");
  });

  it("can create widget linked to dashboard", () => {
    const userId = crypto.randomUUID();
    const dashId = crypto.randomUUID();
    const widgetId = crypto.randomUUID();
    const now = new Date();

    ctx.db
      .insert(users)
      .values({
        id: userId,
        email: "w@example.com",
        passwordHash: "h",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    ctx.db
      .insert(dashboards)
      .values({
        id: dashId,
        userId,
        name: "D",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    ctx.db
      .insert(widgets)
      .values({
        id: widgetId,
        dashboardId: dashId,
        type: "clock",
        title: "Clock",
        config: JSON.stringify({ timezone: "Asia/Shanghai" }),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const row = ctx.db.select().from(widgets).where(eq(widgets.id, widgetId)).get();
    expect(row?.type).toBe("clock");
    expect(JSON.parse(row!.config!)).toEqual({ timezone: "Asia/Shanghai" });
  });

  it("can create widget layout with valid bounds", () => {
    const userId = crypto.randomUUID();
    const dashId = crypto.randomUUID();
    const widgetId = crypto.randomUUID();
    const layoutId = crypto.randomUUID();
    const now = new Date();

    ctx.db
      .insert(users)
      .values({
        id: userId,
        email: "l@example.com",
        passwordHash: "h",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    ctx.db
      .insert(dashboards)
      .values({
        id: dashId,
        userId,
        name: "D",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    ctx.db
      .insert(widgets)
      .values({
        id: widgetId,
        dashboardId: dashId,
        type: "clock",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    ctx.db
      .insert(widgetLayouts)
      .values({
        id: layoutId,
        widgetId,
        breakpoint: "desktop",
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const row = ctx.db.select().from(widgetLayouts).where(eq(widgetLayouts.id, layoutId)).get();
    expect(row?.breakpoint).toBe("desktop");
    expect(row?.w).toBe(4);
  });

  it("rejects negative x", () => {
    const { widgetId, now } = seedMinimal(ctx);
    expect(() => {
      ctx.db
        .insert(widgetLayouts)
        .values({
          id: crypto.randomUUID(),
          widgetId,
          breakpoint: "desktop",
          x: -1,
          y: 0,
          w: 2,
          h: 2,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }).toThrow();
  });

  it("rejects negative y", () => {
    const { widgetId, now } = seedMinimal(ctx);
    expect(() => {
      ctx.db
        .insert(widgetLayouts)
        .values({
          id: crypto.randomUUID(),
          widgetId,
          breakpoint: "desktop",
          x: 0,
          y: -1,
          w: 2,
          h: 2,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }).toThrow();
  });

  it("rejects zero or negative w", () => {
    const { widgetId, now } = seedMinimal(ctx);
    expect(() => {
      ctx.db
        .insert(widgetLayouts)
        .values({
          id: crypto.randomUUID(),
          widgetId,
          breakpoint: "desktop",
          x: 0,
          y: 0,
          w: 0,
          h: 2,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }).toThrow();
  });

  it("rejects zero or negative h", () => {
    const { widgetId, now } = seedMinimal(ctx);
    expect(() => {
      ctx.db
        .insert(widgetLayouts)
        .values({
          id: crypto.randomUUID(),
          widgetId,
          breakpoint: "desktop",
          x: 0,
          y: 0,
          w: 2,
          h: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }).toThrow();
  });

  it("rejects duplicate widget + breakpoint", () => {
    const { widgetId, now } = seedMinimal(ctx);
    ctx.db
      .insert(widgetLayouts)
      .values({
        id: crypto.randomUUID(),
        widgetId,
        breakpoint: "mobile",
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    expect(() => {
      ctx.db
        .insert(widgetLayouts)
        .values({
          id: crypto.randomUUID(),
          widgetId,
          breakpoint: "mobile",
          x: 1,
          y: 1,
          w: 2,
          h: 2,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }).toThrow();
  });

  it("cascades delete widget -> layouts", () => {
    const { widgetId, now } = seedMinimal(ctx);
    const layoutId = crypto.randomUUID();
    ctx.db
      .insert(widgetLayouts)
      .values({
        id: layoutId,
        widgetId,
        breakpoint: "desktop",
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    ctx.db.delete(widgets).where(eq(widgets.id, widgetId)).run();

    const remaining = ctx.db
      .select()
      .from(widgetLayouts)
      .where(eq(widgetLayouts.id, layoutId))
      .get();
    expect(remaining).toBeUndefined();
  });

  it("enforces unique token_hash", () => {
    const { dashId, now } = seedMinimal(ctx);

    ctx.db
      .insert(displayTokens)
      .values({
        id: crypto.randomUUID(),
        dashboardId: dashId,
        tokenHash: "same-hash",
        name: "iPad",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    expect(() => {
      ctx.db
        .insert(displayTokens)
        .values({
          id: crypto.randomUUID(),
          dashboardId: dashId,
          tokenHash: "same-hash",
          name: "Phone",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }).toThrow();
  });

  it("can create integration with separated config/credentials", () => {
    const { userId, now } = seedMinimal(ctx);

    const id = crypto.randomUUID();
    ctx.db
      .insert(integrations)
      .values({
        id,
        userId,
        type: "home_assistant",
        name: "Home",
        config: JSON.stringify({ baseUrl: "http://ha.local" }),
        credentials: JSON.stringify({ token: "secret" }),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const row = ctx.db.select().from(integrations).where(eq(integrations.id, id)).get();
    expect(row?.type).toBe("home_assistant");
    expect(JSON.parse(row!.config!)).toEqual({ baseUrl: "http://ha.local" });
    expect(JSON.parse(row!.credentials!)).toEqual({ token: "secret" });
  });

  it("enforces foreign keys", () => {
    const now = new Date();
    expect(() => {
      ctx.db
        .insert(dashboards)
        .values({
          id: crypto.randomUUID(),
          userId: "non-existent-user",
          name: "Orphan",
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }).toThrow();
  });
});

/** Helper to seed a minimal user + dashboard + widget for layout tests */
function seedMinimal(ctx: ReturnType<typeof createTestDb>) {
  const userId = crypto.randomUUID();
  const dashId = crypto.randomUUID();
  const widgetId = crypto.randomUUID();
  const now = new Date();

  ctx.db
    .insert(users)
    .values({
      id: userId,
      email: `u-${userId.slice(0, 8)}@example.com`,
      passwordHash: "h",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  ctx.db
    .insert(dashboards)
    .values({
      id: dashId,
      userId,
      name: "D",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  ctx.db
    .insert(widgets)
    .values({
      id: widgetId,
      dashboardId: dashId,
      type: "clock",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { userId, dashId, widgetId, now };
}
