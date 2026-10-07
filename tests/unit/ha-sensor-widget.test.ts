import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  HA_SENSOR_TYPE,
  formatHAUpdatedRelative,
  mergeHASensorConfig,
  haSensorConfigSchema,
  haSensorDefaultConfig,
} from "@/widgets/ha-sensor/config";
import { HASensorView } from "@/widgets/ha-sensor/HASensorView";
import { REGISTERED_WIDGET_TYPES, getWidgetConfigEntry } from "@/widgets/config-registry";
import {
  fetchHAEntityState,
  resetHARuntimeConfigForTests,
  saveHAConfig,
  setHAConfigFilePathForTests,
} from "@/lib/home-assistant";

describe("ha-sensor registry", () => {
  it("registers ha-sensor type", () => {
    expect(REGISTERED_WIDGET_TYPES).toContain(HA_SENSOR_TYPE);
    expect(getWidgetConfigEntry(HA_SENSOR_TYPE)?.metadata.name).toBe("HA 传感器");
  });
});

describe("haSensorConfigSchema / merge", () => {
  it("accepts defaults", () => {
    expect(haSensorConfigSchema.safeParse(haSensorDefaultConfig).success).toBe(true);
  });

  it("clamps refreshInterval", () => {
    expect(mergeHASensorConfig({ refreshInterval: 5 }).refreshInterval).toBe(10);
    expect(mergeHASensorConfig({ refreshInterval: 99999 }).refreshInterval).toBe(3600);
  });
});

describe("formatHAUpdatedRelative", () => {
  it("formats minutes", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    const updated = new Date("2026-10-06T11:45:00Z").toISOString();
    expect(formatHAUpdatedRelative(updated, now)).toBe("15 分钟前更新");
  });
});

describe("HASensorView", () => {
  it("renders state and unit when ready", () => {
    const html = renderToString(
      React.createElement(HASensorView, {
        view: {
          kind: "ready",
          data: {
            entityId: "sensor.temperature_salon",
            state: "23.5",
            unit: "°C",
            friendlyName: "客厅温度",
            lastUpdated: new Date(Date.now() - 5 * 60_000).toISOString(),
          },
        },
      }),
    );
    expect(html).toContain("ha-sensor-widget");
    expect(html).toContain("23.5");
    expect(html).toContain("°C");
    expect(html).toContain("客厅温度");
    expect(html).toContain("分钟前更新");
  });

  it("shows HA 未连接", () => {
    const html = renderToString(
      React.createElement(HASensorView, { view: { kind: "ha_unavailable" } }),
    );
    expect(html).toContain("HA 未连接");
    expect(html).toContain('data-state="ha_unavailable"');
  });

  it("shows 实体不存在", () => {
    const html = renderToString(React.createElement(HASensorView, { view: { kind: "not_found" } }));
    expect(html).toContain("实体不存在");
  });
});

describe("fetchHAEntityState (mocked)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-ha-sensor-"));
    setHAConfigFilePathForTests(path.join(tmpDir, "ha-config.json"));
    resetHARuntimeConfigForTests();
    saveHAConfig("http://ha.local:8123", "test-token");
  });

  afterEach(() => {
    setHAConfigFilePathForTests(null);
    resetHARuntimeConfigForTests();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("maps normal state/unit", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          entity_id: "sensor.temperature_salon",
          state: "23.5",
          attributes: {
            unit_of_measurement: "°C",
            friendly_name: "客厅温度",
          },
          last_updated: "2026-10-06T12:00:00+00:00",
        }),
        { status: 200 },
      );
    const result = await fetchHAEntityState("sensor.temperature_salon", fetchMock);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.state).toBe("23.5");
      expect(result.data.unit).toBe("°C");
      expect(result.data.friendlyName).toBe("客厅温度");
    }
  });

  it("401 → unauthorized (HA 未连接 path)", async () => {
    const fetchMock: typeof fetch = async () => new Response("{}", { status: 401 });
    const result = await fetchHAEntityState("sensor.x", fetchMock);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unauthorized");
  });

  it("404 → not_found", async () => {
    const fetchMock: typeof fetch = async () => new Response("{}", { status: 404 });
    const result = await fetchHAEntityState("sensor.missing", fetchMock);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
  });
});
