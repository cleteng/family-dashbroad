import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
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
  (table) => [unique().on(table.widgetId, table.breakpoint)],
);
