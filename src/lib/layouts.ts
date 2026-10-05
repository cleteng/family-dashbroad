import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { widgets } from "@/db/schema/widgets";
import { widgetLayouts } from "@/db/schema/widget-layouts";

export const BREAKPOINTS = ["desktop", "tablet", "mobile"] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

export type LayoutEntry = {
  widgetId: string;
  breakpoint: Breakpoint;
  x: number;
  y: number;
  w: number;
  h: number;
};

const layoutEntrySchema = z.object({
  widgetId: z.string().min(1, "widgetId is required"),
  breakpoint: z.enum(BREAKPOINTS, {
    errorMap: () => ({
      message: `breakpoint must be one of: ${BREAKPOINTS.join(", ")}`,
    }),
  }),
  x: z
    .number({ invalid_type_error: "x must be an integer >= 0" })
    .int("x must be an integer")
    .min(0, "x must be >= 0"),
  y: z
    .number({ invalid_type_error: "y must be an integer >= 0" })
    .int("y must be an integer")
    .min(0, "y must be >= 0"),
  w: z
    .number({ invalid_type_error: "w must be an integer >= 1" })
    .int("w must be an integer")
    .min(1, "w must be >= 1"),
  h: z
    .number({ invalid_type_error: "h must be an integer >= 1" })
    .int("h must be an integer")
    .min(1, "h must be >= 1"),
});

export const saveLayoutSchema = z.object({
  layouts: z.array(layoutEntrySchema),
});

export type SaveLayoutInput = z.infer<typeof saveLayoutSchema>;

/**
 * Deduplicate by (widgetId, breakpoint): later entries overwrite earlier ones.
 */
export function dedupeLayoutEntries(entries: LayoutEntry[]): LayoutEntry[] {
  const map = new Map<string, LayoutEntry>();
  for (const e of entries) {
    map.set(`${e.widgetId}::${e.breakpoint}`, e);
  }
  return Array.from(map.values());
}

function listWidgetIdsForDashboard(dashboardId: string): string[] {
  const rows = db
    .select({ id: widgets.id })
    .from(widgets)
    .where(eq(widgets.dashboardId, dashboardId))
    .all();
  return rows.map((r) => r.id);
}

/**
 * Get all layout entries for widgets on this dashboard.
 * Widgets without a layout for a breakpoint are omitted.
 */
export function getLayout(dashboardId: string): LayoutEntry[] {
  const widgetIds = listWidgetIdsForDashboard(dashboardId);
  if (widgetIds.length === 0) return [];

  const rows = db
    .select({
      widgetId: widgetLayouts.widgetId,
      breakpoint: widgetLayouts.breakpoint,
      x: widgetLayouts.x,
      y: widgetLayouts.y,
      w: widgetLayouts.w,
      h: widgetLayouts.h,
    })
    .from(widgetLayouts)
    .where(inArray(widgetLayouts.widgetId, widgetIds))
    .all();

  return rows.map((r) => ({
    widgetId: r.widgetId,
    breakpoint: r.breakpoint as Breakpoint,
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
  }));
}

/**
 * Full-replace layout for a dashboard.
 * - Validates every widgetId belongs to the dashboard (else throws with message).
 * - Dedupes (widgetId, breakpoint) keeping last.
 * - Transaction: delete all layouts for dashboard widgets, then insert new rows.
 * - Empty layouts array clears all layout rows for this dashboard's widgets.
 */
export function saveLayout(
  dashboardId: string,
  entries: LayoutEntry[],
): LayoutEntry[] {
  const ownedIds = new Set(listWidgetIdsForDashboard(dashboardId));
  const deduped = dedupeLayoutEntries(entries);

  for (const e of deduped) {
    if (!ownedIds.has(e.widgetId)) {
      throw new LayoutValidationError(
        `widgetId ${e.widgetId} does not belong to this dashboard`,
      );
    }
  }

  const widgetIds = Array.from(ownedIds);

  db.transaction((tx) => {
    if (widgetIds.length > 0) {
      tx.delete(widgetLayouts)
        .where(inArray(widgetLayouts.widgetId, widgetIds))
        .run();
    }

    const now = new Date();
    for (const e of deduped) {
      tx.insert(widgetLayouts)
        .values({
          id: crypto.randomUUID(),
          widgetId: e.widgetId,
          breakpoint: e.breakpoint,
          x: e.x,
          y: e.y,
          w: e.w,
          h: e.h,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  });

  return getLayout(dashboardId);
}

export class LayoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LayoutValidationError";
  }
}
