import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AlmanacRenderer } from "@/widgets/chinese-almanac/AlmanacRenderer";
import { almanacDateColorClass } from "@/widgets/chinese-almanac/config";
import { getWidgetConfigEntry, REGISTERED_WIDGET_TYPES } from "@/widgets/config-registry";

describe("chinese-almanac registration", () => {
  it("is in config-registry", () => {
    expect(REGISTERED_WIDGET_TYPES).toContain("chinese-almanac");
    expect(getWidgetConfigEntry("chinese-almanac")?.metadata.name).toBe("传统挂历");
  });
});

describe("almanacDateColorClass", () => {
  it("holiday → red, otherwise green", () => {
    expect(almanacDateColorClass("春节")).toContain("text-red");
    expect(almanacDateColorClass(null)).toContain("text-green");
  });
});

describe("AlmanacRenderer", () => {
  it("renders day number, weekday, lunar; no 福到万家", () => {
    const html = renderToString(React.createElement(AlmanacRenderer, { config: {} }));
    expect(html).toContain("chinese-almanac-widget");
    expect(html).toContain("almanac-day-number");
    expect(html).toContain("almanac-weekday");
    expect(html).toContain("almanac-lunar");
    expect(html).toContain("星期");
    expect(html).toContain("农历");
    expect(html).not.toContain("福到万家");
    expect(html).toContain("almanac-yiji");
    expect(html).toContain("almanac-times");
    expect(html).toContain("almanac-meta");
  });
});

describe("getCalendarDay almanac extras", () => {
  it("returns yi/ji/naYin/times for a known day", async () => {
    const { getCalendarDay } = await import("@/lib/calendar");
    const d = getCalendarDay(2026, 10, 2);
    expect(Array.isArray(d.yi)).toBe(true);
    expect(Array.isArray(d.ji)).toBe(true);
    expect(d.naYin.length).toBeGreaterThan(0);
    expect(d.times.length).toBeGreaterThan(0);
    expect(["吉", "凶"]).toContain(d.times[0].luck);
  });
});
