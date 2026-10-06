import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { getMonthCalendar } from "@/lib/calendar";
import { CalendarRenderer } from "@/widgets/calendar/CalendarRenderer";
import { calendarConfigSchema, calendarDefaultConfig } from "@/widgets/calendar/config";
import { getWidgetConfigEntry, REGISTERED_WIDGET_TYPES } from "@/widgets/config-registry";

describe("config-registry single source", () => {
  it("includes clock and calendar", () => {
    expect(REGISTERED_WIDGET_TYPES).toContain("clock");
    expect(REGISTERED_WIDGET_TYPES).toContain("calendar");
    expect(getWidgetConfigEntry("calendar")?.metadata.name).toBe("日历");
  });
});

describe("getMonthCalendar structure", () => {
  it("is 6x7 and Monday-first", () => {
    const grid = getMonthCalendar(2026, 3);
    expect(grid).toHaveLength(6);
    for (const row of grid) {
      expect(row).toHaveLength(7);
      expect(row[0].weekday).toBe("一");
      expect(row[6].weekday).toBe("日");
    }
  });
});

describe("calendar config schema", () => {
  it("accepts defaults", () => {
    const r = calendarConfigSchema.safeParse(calendarDefaultConfig);
    expect(r.success).toBe(true);
  });
});

describe("CalendarRenderer", () => {
  it("renders month title and grid without throw", () => {
    const html = renderToString(
      React.createElement(CalendarRenderer, {
        config: { showLunar: true },
      }),
    );
    expect(html).toContain("calendar-widget");
    expect(html).toContain("年");
    expect(html).toContain("月");
  });
});
