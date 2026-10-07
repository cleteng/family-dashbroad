import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import {
  clockConfigSchema,
  clockDefaultConfig,
  mergeClockConfig,
  CLOCK_TYPE,
} from "@/widgets/clock/config";
import { ClockRenderer } from "@/widgets/clock/ClockRenderer";
import { registerWidget, getWidgetDefinition, listWidgetDefinitions } from "@/widgets/registry";
import { clockDefinition } from "@/widgets/clock/definition";
import { resolveRegisteredConfig } from "@/lib/widgets";

describe("widget registry", () => {
  it("registers and retrieves clock", () => {
    registerWidget(clockDefinition);
    const def = getWidgetDefinition("clock");
    expect(def).toBeDefined();
    expect(def?.metadata.name).toBe("时钟");
    expect(getWidgetDefinition("unknown-type")).toBeUndefined();
  });

  it("list includes clock metadata", () => {
    registerWidget(clockDefinition);
    const list = listWidgetDefinitions();
    expect(list.some((d) => d.type === "clock")).toBe(true);
    const clock = list.find((d) => d.type === "clock");
    expect(clock?.metadata.description).toContain("时间");
  });
});

describe("clock configSchema", () => {
  it("accepts valid config", () => {
    const r = clockConfigSchema.safeParse({
      timezone: "America/Toronto",
      format: "24h",
      showSeconds: true,
      showDate: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid timezone", () => {
    const r = clockConfigSchema.safeParse({
      timezone: "Mars/Olympus",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid format", () => {
    const r = clockConfigSchema.safeParse({ format: "36h" });
    expect(r.success).toBe(false);
  });

  it("merge defaults when empty object", () => {
    const merged = mergeClockConfig({});
    expect(merged).toEqual(clockDefaultConfig);
  });
});

describe("resolveRegisteredConfig", () => {
  it("clock empty config becomes defaultConfig", () => {
    const resolved = resolveRegisteredConfig(CLOCK_TYPE, {});
    expect(resolved).toMatchObject(clockDefaultConfig);
  });

  it("clock invalid timezone throws", () => {
    expect(() => resolveRegisteredConfig(CLOCK_TYPE, { timezone: "Mars/Olympus" })).toThrow();
  });

  it("unregistered type passes through plain object", () => {
    const resolved = resolveRegisteredConfig("__not_a_real_widget__", {
      city: "Toronto",
    });
    expect(resolved).toEqual({ city: "Toronto" });
  });
});

describe("ClockRenderer", () => {
  it("renderToString does not throw", () => {
    const html = renderToString(
      React.createElement(ClockRenderer, {
        config: clockDefaultConfig as unknown as Record<string, unknown>,
      }),
    );
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });
});
