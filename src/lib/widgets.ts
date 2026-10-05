import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { widgets } from "@/db/schema/widgets";

export const WIDGET_TYPES = [
  "clock",
  "weather",
  "calendar",
  "chinese-almanac",
  "google-tasks",
  "home-assistant-sensor",
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export type Widget = {
  id: string;
  dashboardId: string;
  type: string;
  title: string | null;
  config: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

const configSchema = z
  .unknown()
  .optional()
  .nullable()
  .superRefine((val, ctx) => {
    if (val === undefined || val === null) return;
    if (typeof val !== "object" || Array.isArray(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "config must be a plain object or null",
      });
    }
  })
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    return val as Record<string, unknown>;
  });

const titleSchema = z
  .string()
  .max(100, "title must be at most 100 characters")
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  });

export const createWidgetSchema = z.object({
  type: z.enum(WIDGET_TYPES, {
    errorMap: () => ({
      message: `type must be one of: ${WIDGET_TYPES.join(", ")}`,
    }),
  }),
  title: titleSchema,
  config: configSchema,
});

export const updateWidgetSchema = z
  .object({
    type: z
      .enum(WIDGET_TYPES, {
        errorMap: () => ({
          message: `type must be one of: ${WIDGET_TYPES.join(", ")}`,
        }),
      })
      .optional(),
    title: titleSchema,
    config: configSchema,
  })
  .refine(
    (data) =>
      data.type !== undefined ||
      data.title !== undefined ||
      data.config !== undefined,
    { message: "At least one of type, title, or config is required" },
  );

export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;

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

function toWidget(row: {
  id: string;
  dashboardId: string;
  type: string;
  title: string | null;
  config: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Widget {
  return {
    id: row.id,
    dashboardId: row.dashboardId,
    type: row.type,
    title: row.title,
    config: parseConfig(row.config),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listWidgets(dashboardId: string): Widget[] {
  const rows = db
    .select()
    .from(widgets)
    .where(eq(widgets.dashboardId, dashboardId))
    .orderBy(asc(widgets.createdAt))
    .all();
  return rows.map(toWidget);
}

export function createWidget(
  dashboardId: string,
  input: CreateWidgetInput,
): Widget {
  const id = crypto.randomUUID();
  const now = new Date();
  const title = input.title === undefined ? null : input.title;
  const configStr =
    input.config === undefined || input.config === null
      ? null
      : JSON.stringify(input.config);

  db.insert(widgets)
    .values({
      id,
      dashboardId,
      type: input.type,
      title,
      config: configStr,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = db.select().from(widgets).where(eq(widgets.id, id)).get();
  if (!row) throw new Error("Failed to create widget");
  return toWidget(row);
}

export function getWidget(
  dashboardId: string,
  widgetId: string,
): Widget | null {
  const row = db
    .select()
    .from(widgets)
    .where(and(eq(widgets.id, widgetId), eq(widgets.dashboardId, dashboardId)))
    .get();
  return row ? toWidget(row) : null;
}

export function updateWidget(
  dashboardId: string,
  widgetId: string,
  input: UpdateWidgetInput,
): Widget | null {
  const existing = getWidget(dashboardId, widgetId);
  if (!existing) return null;

  const patch: {
    type?: string;
    title?: string | null;
    config?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.type !== undefined) patch.type = input.type;
  if (input.title !== undefined) patch.title = input.title;
  if (input.config !== undefined) {
    patch.config =
      input.config === null ? null : JSON.stringify(input.config);
  }

  db.update(widgets)
    .set(patch)
    .where(and(eq(widgets.id, widgetId), eq(widgets.dashboardId, dashboardId)))
    .run();

  return getWidget(dashboardId, widgetId);
}

export function deleteWidget(
  dashboardId: string,
  widgetId: string,
): boolean {
  const existing = getWidget(dashboardId, widgetId);
  if (!existing) return false;

  db.delete(widgets)
    .where(and(eq(widgets.id, widgetId), eq(widgets.dashboardId, dashboardId)))
    .run();
  return true;
}
