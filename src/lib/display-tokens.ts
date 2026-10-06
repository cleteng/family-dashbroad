import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { displayTokens } from "@/db/schema/display-tokens";
import { widgets } from "@/db/schema/widgets";
import { widgetLayouts } from "@/db/schema/widget-layouts";
import { dashboards } from "@/db/schema/dashboards";
import type { Breakpoint } from "@/lib/layouts";

export function hashDisplayToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateDisplayToken(): string {
  return randomBytes(32).toString("hex");
}

export const createDisplayTokenSchema = z.object({
  name: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined || v === null) return null;
      const t = v.trim();
      return t.length === 0 ? null : t;
    }),
});

export type DisplayWidget = {
  id: string;
  type: string;
  title: string | null;
  config: Record<string, unknown> | null;
};

export type DisplayLayoutEntry = {
  widgetId: string;
  breakpoint: Breakpoint;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DisplayPayload = {
  dashboardId: string;
  dashboardName: string;
  widgets: DisplayWidget[];
  layouts: DisplayLayoutEntry[];
};

export type TokenLookupResult =
  | { status: "ok"; tokenId: string; dashboardId: string }
  | { status: "not_found" }
  | { status: "disabled" };

export function lookupDisplayToken(plainToken: string): TokenLookupResult {
  const hash = hashDisplayToken(plainToken);
  const row = db
    .select({
      id: displayTokens.id,
      dashboardId: displayTokens.dashboardId,
      isActive: displayTokens.isActive,
    })
    .from(displayTokens)
    .where(eq(displayTokens.tokenHash, hash))
    .get();

  if (!row) return { status: "not_found" };
  if (!row.isActive) return { status: "disabled" };
  return { status: "ok", tokenId: row.id, dashboardId: row.dashboardId };
}

export function touchDisplayToken(tokenId: string): void {
  db.update(displayTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(displayTokens.id, tokenId))
    .run();
}

function parseConfig(raw: string | null): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadDisplayPayload(dashboardId: string): DisplayPayload | null {
  const dash = db
    .select({ id: dashboards.id, name: dashboards.name })
    .from(dashboards)
    .where(eq(dashboards.id, dashboardId))
    .get();
  if (!dash) return null;

  const widgetRows = db
    .select()
    .from(widgets)
    .where(eq(widgets.dashboardId, dashboardId))
    .all();

  const widgetIds = widgetRows.map((w) => w.id);
  let layouts: DisplayLayoutEntry[] = [];
  if (widgetIds.length > 0) {
    const rows = db
      .select()
      .from(widgetLayouts)
      .where(inArray(widgetLayouts.widgetId, widgetIds))
      .all();
    layouts = rows.map((r) => ({
      widgetId: r.widgetId,
      breakpoint: r.breakpoint as Breakpoint,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
    }));
  }

  return {
    dashboardId: dash.id,
    dashboardName: dash.name,
    widgets: widgetRows.map((w) => ({
      id: w.id,
      type: w.type,
      title: w.title,
      config: parseConfig(w.config),
    })),
    layouts,
  };
}

export function createDisplayTokenForDashboard(
  dashboardId: string,
  name: string | null,
): { id: string; token: string; name: string | null; displayUrl: string } {
  const token = generateDisplayToken();
  const tokenHash = hashDisplayToken(token);
  const id = crypto.randomUUID();
  const now = new Date();

  db.insert(displayTokens)
    .values({
      id,
      dashboardId,
      tokenHash,
      name,
      isActive: true,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return {
    id,
    token,
    name,
    displayUrl: `/display/${token}`,
  };
}

export function setDisplayTokenActive(
  tokenId: string,
  isActive: boolean,
): boolean {
  const existing = db
    .select({ id: displayTokens.id })
    .from(displayTokens)
    .where(eq(displayTokens.id, tokenId))
    .get();
  if (!existing) return false;
  db.update(displayTokens)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(displayTokens.id, tokenId))
    .run();
  return true;
}


export type DisplayTokenListItem = {
  id: string;
  name: string | null;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  updatedAt: Date;
};

/** List tokens for a dashboard. Never includes plaintext token or hash. */
export function listDisplayTokens(dashboardId: string): DisplayTokenListItem[] {
  const rows = db
    .select({
      id: displayTokens.id,
      name: displayTokens.name,
      isActive: displayTokens.isActive,
      createdAt: displayTokens.createdAt,
      lastUsedAt: displayTokens.lastUsedAt,
      updatedAt: displayTokens.updatedAt,
    })
    .from(displayTokens)
    .where(eq(displayTokens.dashboardId, dashboardId))
    .orderBy(desc(displayTokens.createdAt))
    .all();
  return rows;
}

/**
 * Regenerate token: new plaintext + hash on same row. Old plaintext stops working.
 * Returns new plaintext once.
 */
export function regenerateDisplayToken(
  dashboardId: string,
  tokenId: string,
): { token: string; displayUrl: string } | null {
  const row = db
    .select({ id: displayTokens.id, tokenHash: displayTokens.tokenHash })
    .from(displayTokens)
    .where(
      and(
        eq(displayTokens.id, tokenId),
        eq(displayTokens.dashboardId, dashboardId),
      ),
    )
    .get();
  if (!row) return null;

  // Keep generating until hash differs from previous (extremely rare collision loop)
  let token = generateDisplayToken();
  let tokenHash = hashDisplayToken(token);
  let guard = 0;
  while (tokenHash === row.tokenHash && guard < 5) {
    token = generateDisplayToken();
    tokenHash = hashDisplayToken(token);
    guard += 1;
  }

  db.update(displayTokens)
    .set({
      tokenHash,
      updatedAt: new Date(),
    })
    .where(eq(displayTokens.id, tokenId))
    .run();

  return { token, displayUrl: `/display/${token}` };
}

export function deleteDisplayToken(
  dashboardId: string,
  tokenId: string,
): boolean {
  const row = db
    .select({ id: displayTokens.id })
    .from(displayTokens)
    .where(
      and(
        eq(displayTokens.id, tokenId),
        eq(displayTokens.dashboardId, dashboardId),
      ),
    )
    .get();
  if (!row) return false;
  db.delete(displayTokens).where(eq(displayTokens.id, tokenId)).run();
  return true;
}
