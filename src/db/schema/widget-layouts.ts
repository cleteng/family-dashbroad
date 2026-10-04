import { sqliteTable, text, integer, unique, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { widgets } from "./widgets";

export const widgetLayouts = sqliteTable(
  "widget_layouts",
  {
    id: text("id").primaryKey(),
    widgetId: text("widget_id")
      .notNull()
      .references(() => widgets.id, { onDelete: "cascade" }),
    breakpoint: text("breakpoint").notNull(), // desktop | tablet | mobile
    x: integer("x").notNull(),
    y: integer("y").notNull(),
    w: integer("w").notNull(),
    h: integer("h").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique().on(table.widgetId, table.breakpoint),
    check("widget_layouts_x_non_negative", sql`${table.x} >= 0`),
    check("widget_layouts_y_non_negative", sql`${table.y} >= 0`),
    check("widget_layouts_w_positive", sql`${table.w} > 0`),
    check("widget_layouts_h_positive", sql`${table.h} > 0`),
  ],
);
