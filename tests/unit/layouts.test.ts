import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/db/schema";
import { dedupeLayoutEntries, saveLayoutSchema, type LayoutEntry } from "@/lib/layouts";

function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-lay-"));
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

function seedDashboard(sqlite: Database.Database, userId: string): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO dashboards (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, userId, "D", null, now, now);
  return id;
}

function seedWidget(sqlite: Database.Database, dashboardId: string): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO widgets (id, dashboard_id, type, title, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, dashboardId, "clock", null, null, now, now);
  return id;
}

describe("layout validation", () => {
  it("accepts valid entries", () => {
    const r = saveLayoutSchema.safeParse({
      layouts: [
        {
          widgetId: "w1",
          breakpoint: "desktop",
          x: 0,
          y: 0,
          w: 4,
          h: 2,
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects illegal breakpoint", () => {
    const r = saveLayoutSchema.safeParse({
      layouts: [{ widgetId: "w1", breakpoint: "watch", x: 0, y: 0, w: 1, h: 1 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects w:0 and x:-1 and non-integers", () => {
    expect(
      saveLayoutSchema.safeParse({
        layouts: [{ widgetId: "w1", breakpoint: "desktop", x: 0, y: 0, w: 0, h: 1 }],
      }).success,
    ).toBe(false);
    expect(
      saveLayoutSchema.safeParse({
        layouts: [{ widgetId: "w1", breakpoint: "desktop", x: -1, y: 0, w: 1, h: 1 }],
      }).success,
    ).toBe(false);
    expect(
      saveLayoutSchema.safeParse({
        layouts: [
          {
            widgetId: "w1",
            breakpoint: "desktop",
            x: 0.5,
            y: 0,
            w: 1,
            h: 1,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("accepts empty layouts array", () => {
    expect(saveLayoutSchema.safeParse({ layouts: [] }).success).toBe(true);
  });

  it("dedupe keeps last (widgetId, breakpoint)", () => {
    const entries: LayoutEntry[] = [
      { widgetId: "a", breakpoint: "desktop", x: 0, y: 0, w: 1, h: 1 },
      { widgetId: "a", breakpoint: "desktop", x: 2, y: 3, w: 4, h: 5 },
    ];
    const d = dedupeLayoutEntries(entries);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ x: 2, y: 3, w: 4, h: 5 });
  });
});

describe("layout storage semantics", () => {
  let ctx: ReturnType<typeof createTestDb>;
  let dashId: string;
  let w1: string;
  let w2: string;

  beforeEach(() => {
    ctx = createTestDb();
    const userId = seedUser(ctx.sqlite, "u@example.com");
    dashId = seedDashboard(ctx.sqlite, userId);
    w1 = seedWidget(ctx.sqlite, dashId);
    w2 = seedWidget(ctx.sqlite, dashId);
  });

  afterEach(() => {
    ctx.sqlite.close();
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  it("save and read round-trip for multiple breakpoints", () => {
    const now = Date.now();
    const entries = [
      { widgetId: w1, breakpoint: "desktop", x: 0, y: 0, w: 4, h: 2 },
      { widgetId: w1, breakpoint: "tablet", x: 0, y: 0, w: 2, h: 2 },
      { widgetId: w1, breakpoint: "mobile", x: 0, y: 0, w: 1, h: 1 },
      { widgetId: w2, breakpoint: "desktop", x: 4, y: 0, w: 4, h: 2 },
    ];
    for (const e of entries) {
      ctx.sqlite
        .prepare(
          "INSERT INTO widget_layouts (id, widget_id, breakpoint, x, y, w, h, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(crypto.randomUUID(), e.widgetId, e.breakpoint, e.x, e.y, e.w, e.h, now, now);
    }

    const rows = ctx.sqlite
      .prepare(
        "SELECT widget_id, breakpoint, x, y, w, h FROM widget_layouts WHERE widget_id IN (?, ?) ORDER BY widget_id, breakpoint",
      )
      .all(w1, w2) as {
      widget_id: string;
      breakpoint: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }[];
    expect(rows).toHaveLength(4);
  });

  it("full replace: second save drops layouts not in payload", () => {
    const now = Date.now();
    ctx.sqlite
      .prepare(
        "INSERT INTO widget_layouts (id, widget_id, breakpoint, x, y, w, h, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(crypto.randomUUID(), w1, "desktop", 0, 0, 2, 2, now, now);
    ctx.sqlite
      .prepare(
        "INSERT INTO widget_layouts (id, widget_id, breakpoint, x, y, w, h, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(crypto.randomUUID(), w2, "desktop", 2, 0, 2, 2, now, now);

    const widgetIds = [w1, w2];
    ctx.sqlite
      .prepare(
        `DELETE FROM widget_layouts WHERE widget_id IN (${widgetIds.map(() => "?").join(",")})`,
      )
      .run(...widgetIds);
    ctx.sqlite
      .prepare(
        "INSERT INTO widget_layouts (id, widget_id, breakpoint, x, y, w, h, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(crypto.randomUUID(), w1, "desktop", 1, 1, 3, 3, now, now);

    const remaining = ctx.sqlite.prepare("SELECT widget_id FROM widget_layouts").all() as {
      widget_id: string;
    }[];
    expect(remaining.map((r) => r.widget_id)).toEqual([w1]);
  });

  it("empty array clears layouts", () => {
    const now = Date.now();
    ctx.sqlite
      .prepare(
        "INSERT INTO widget_layouts (id, widget_id, breakpoint, x, y, w, h, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(crypto.randomUUID(), w1, "mobile", 0, 0, 1, 1, now, now);

    ctx.sqlite.prepare("DELETE FROM widget_layouts WHERE widget_id IN (?, ?)").run(w1, w2);

    const count = ctx.sqlite.prepare("SELECT COUNT(*) as c FROM widget_layouts").get() as {
      c: number;
    };
    expect(count.c).toBe(0);
  });

  it("widgetId from another dashboard is invalid (ownership check pattern)", () => {
    const otherUser = seedUser(ctx.sqlite, "other@example.com");
    const otherDash = seedDashboard(ctx.sqlite, otherUser);
    const otherWidget = seedWidget(ctx.sqlite, otherDash);

    const owned = ctx.sqlite
      .prepare("SELECT id FROM widgets WHERE dashboard_id = ?")
      .all(dashId) as { id: string }[];
    const ownedSet = new Set(owned.map((r) => r.id));
    expect(ownedSet.has(otherWidget)).toBe(false);
  });

  it("CHECK constraint rejects w=0 at DB level", () => {
    const now = Date.now();
    expect(() => {
      ctx.sqlite
        .prepare(
          "INSERT INTO widget_layouts (id, widget_id, breakpoint, x, y, w, h, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(crypto.randomUUID(), w1, "desktop", 0, 0, 0, 1, now, now);
    }).toThrow();
  });
});
