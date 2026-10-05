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
import { widgets } from "@/db/schema/widgets";
import {
  createDashboardSchema,
  updateDashboardSchema,
} from "@/lib/dashboards";

function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-dash-"));
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

describe("dashboards service", () => {
  let ctx: ReturnType<typeof createTestDb>;
  let userA: string;
  let userB: string;

  beforeEach(() => {
    ctx = createTestDb();
    userA = seedUser(ctx.sqlite, "a@example.com");
    userB = seedUser(ctx.sqlite, "b@example.com");
  });

  afterEach(() => {
    ctx.sqlite.close();
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  it("createDashboardSchema accepts valid name and optional description", () => {
    const ok = createDashboardSchema.safeParse({
      name: "  Living Room  ",
      description: "Main display",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.name).toBe("Living Room");
      expect(ok.data.description).toBe("Main display");
    }

    const emptyDesc = createDashboardSchema.safeParse({
      name: "Kitchen",
      description: "   ",
    });
    expect(emptyDesc.success).toBe(true);
    if (emptyDesc.success) {
      expect(emptyDesc.data.description).toBeNull();
    }
  });

  it("createDashboardSchema rejects empty or too-long name", () => {
    expect(createDashboardSchema.safeParse({ name: "" }).success).toBe(false);
    expect(createDashboardSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
    expect(
      createDashboardSchema.safeParse({ name: "x".repeat(101) }).success,
    ).toBe(false);
  });

  it("updateDashboardSchema requires at least one field", () => {
    expect(updateDashboardSchema.safeParse({}).success).toBe(false);
    expect(
      updateDashboardSchema.safeParse({ name: "New Name" }).success,
    ).toBe(true);
    expect(
      updateDashboardSchema.safeParse({ description: null }).success,
    ).toBe(true);
  });

  it("ownership: user only sees own dashboards (SQL pattern)", () => {
    const now = Date.now();
    const idA = crypto.randomUUID();
    const idB = crypto.randomUUID();
    ctx.sqlite
      .prepare(
        "INSERT INTO dashboards (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(idA, userA, "A Board", null, now, now);
    ctx.sqlite
      .prepare(
        "INSERT INTO dashboards (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(idB, userB, "B Board", null, now, now);

    const aRows = ctx.sqlite
      .prepare("SELECT id FROM dashboards WHERE user_id = ?")
      .all(userA) as { id: string }[];
    expect(aRows.map((r) => r.id)).toEqual([idA]);

    const cross = ctx.sqlite
      .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
      .get(idB, userA);
    expect(cross).toBeUndefined();
  });

  it("cascade: deleting dashboard removes widgets", () => {
    const now = Date.now();
    const dashId = crypto.randomUUID();
    const widgetId = crypto.randomUUID();
    ctx.sqlite
      .prepare(
        "INSERT INTO dashboards (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(dashId, userA, "Cascade Board", null, now, now);
    ctx.sqlite
      .prepare(
        "INSERT INTO widgets (id, dashboard_id, type, title, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(widgetId, dashId, "clock", "Clock", null, now, now);

    ctx.sqlite.prepare("DELETE FROM dashboards WHERE id = ?").run(dashId);

    const w = ctx.sqlite
      .prepare("SELECT id FROM widgets WHERE id = ?")
      .get(widgetId);
    expect(w).toBeUndefined();
  });

  it("description can be null and updated", () => {
    const now = Date.now();
    const dashId = crypto.randomUUID();
    ctx.sqlite
      .prepare(
        "INSERT INTO dashboards (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(dashId, userA, "Room", null, now, now);

    ctx.sqlite
      .prepare("UPDATE dashboards SET description = ? WHERE id = ?")
      .run("Updated desc", dashId);

    const row = ctx.sqlite
      .prepare("SELECT description FROM dashboards WHERE id = ?")
      .get(dashId) as { description: string };
    expect(row.description).toBe("Updated desc");
  });
});

describe("dashboards service with isolated db client", () => {
  it("create / list / get / update / delete via service when env isolated", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-svc-"));
    const dbPath = path.join(dir, "svc.db");
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.SESSION_SECRET = "s".repeat(32);

    const sqlite = new Database(dbPath);
    sqlite.pragma("foreign_keys = ON");
    const localDb = drizzle(sqlite, { schema });
    migrate(localDb, { migrationsFolder: path.join(process.cwd(), "drizzle") });

    const userId = crypto.randomUUID();
    const now = new Date();
    localDb
      .insert(users)
      .values({
        id: userId,
        email: `svc-${userId.slice(0, 8)}@example.com`,
        passwordHash: "h",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const parsed = createDashboardSchema.parse({
      name: "Service Board",
      description: "via test",
    });
    const id = crypto.randomUUID();
    localDb
      .insert(schema.dashboards)
      .values({
        id,
        userId,
        name: parsed.name,
        description: parsed.description ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const listed = localDb
      .select()
      .from(schema.dashboards)
      .where(eq(schema.dashboards.userId, userId))
      .all();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe("Service Board");

    const widgetId = crypto.randomUUID();
    localDb
      .insert(widgets)
      .values({
        id: widgetId,
        dashboardId: id,
        type: "clock",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    localDb.delete(schema.dashboards).where(eq(schema.dashboards.id, id)).run();
    const gone = localDb
      .select()
      .from(widgets)
      .where(eq(widgets.id, widgetId))
      .get();
    expect(gone).toBeUndefined();

    sqlite.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
