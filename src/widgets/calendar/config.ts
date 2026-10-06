import { z } from "zod";

export const CALENDAR_TYPE = "calendar" as const;

export const calendarMetadata = {
  name: "日历",
  description: "月历视图，含农历、节气与节假日",
} as const;

export const calendarDefaultConfig = {
  weekStart: "monday" as const,
  showLunar: true,
  showCanadaHolidays: true,
};

export const calendarConfigSchema = z.object({
  weekStart: z.enum(["monday", "sunday"]).optional(),
  showLunar: z.boolean().optional(),
  showCanadaHolidays: z.boolean().optional(),
});

export type CalendarConfig = {
  weekStart: "monday" | "sunday";
  showLunar: boolean;
  showCanadaHolidays: boolean;
};

export function mergeCalendarConfig(
  partial: Record<string, unknown> | null | undefined,
): CalendarConfig {
  const base = { ...calendarDefaultConfig, ...(partial ?? {}) };
  const parsed = calendarConfigSchema.parse(base);
  return {
    weekStart: parsed.weekStart ?? calendarDefaultConfig.weekStart,
    showLunar: parsed.showLunar ?? calendarDefaultConfig.showLunar,
    showCanadaHolidays: parsed.showCanadaHolidays ?? calendarDefaultConfig.showCanadaHolidays,
  };
}
