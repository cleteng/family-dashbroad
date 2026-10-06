import { describe, it, expect } from "vitest";
import {
  HA_PRESETS,
  getHAPreset,
  matchEntities,
  type HAPresetEntity,
} from "@/lib/ha-presets";

const sampleEntities: HAPresetEntity[] = [
  {
    entityId: "sensor.salon_temperature",
    friendlyName: "Salon Temperature",
  },
  {
    entityId: "sensor.outdoor_temp",
    friendlyName: "室外气温",
  },
  {
    entityId: "sensor.living_humidity",
    friendlyName: "Living Humidity",
  },
  {
    entityId: "sensor.co2_office",
    friendlyName: "Office CO2",
  },
  {
    entityId: "sensor.pm25_bedroom",
    friendlyName: "Bedroom PM2.5",
  },
  {
    entityId: "sensor.aqi_outdoor",
    friendlyName: "Outdoor AQI",
  },
  {
    entityId: "sensor.power_usage",
    friendlyName: "Power",
  },
];

describe("HA_PRESETS", () => {
  it("has exactly 5 presets with unit and icon", () => {
    expect(HA_PRESETS).toHaveLength(5);
    const keys = HA_PRESETS.map((p) => p.key);
    expect(keys).toEqual([
      "temperature",
      "humidity",
      "co2",
      "pm25",
      "air-quality",
    ]);
    for (const p of HA_PRESETS) {
      expect(p.icon.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.matchKeywords.length).toBeGreaterThan(0);
    }
    expect(getHAPreset("temperature")?.unit).toBe("°C");
    expect(getHAPreset("humidity")?.unit).toBe("%");
    expect(getHAPreset("co2")?.unit).toBe("ppm");
    expect(getHAPreset("pm25")?.unit).toBe("µg/m³");
    expect(getHAPreset("air-quality")?.unit).toBe("");
  });
});

describe("matchEntities", () => {
  it("matches temperature keywords case-insensitively", () => {
    const preset = getHAPreset("temperature")!;
    const hits = matchEntities(preset, sampleEntities);
    const ids = hits.map((h) => h.entityId);
    expect(ids).toContain("sensor.salon_temperature");
    expect(ids).toContain("sensor.outdoor_temp");
    expect(ids).not.toContain("sensor.power_usage");
  });

  it("partial match on friendly_name (中文)", () => {
    const preset = getHAPreset("temperature")!;
    const hits = matchEntities(preset, [
      { entityId: "sensor.x", friendlyName: "客厅温度" },
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0].entityId).toBe("sensor.x");
  });

  it("matches humidity / co2 / pm25 / air-quality", () => {
    expect(
      matchEntities(getHAPreset("humidity")!, sampleEntities).map(
        (e) => e.entityId,
      ),
    ).toEqual(["sensor.living_humidity"]);
    expect(
      matchEntities(getHAPreset("co2")!, sampleEntities).map((e) => e.entityId),
    ).toEqual(["sensor.co2_office"]);
    expect(
      matchEntities(getHAPreset("pm25")!, sampleEntities).map(
        (e) => e.entityId,
      ),
    ).toEqual(["sensor.pm25_bedroom"]);
    expect(
      matchEntities(getHAPreset("air-quality")!, sampleEntities).map(
        (e) => e.entityId,
      ),
    ).toEqual(["sensor.aqi_outdoor"]);
  });

  it("returns empty array when no match", () => {
    const preset = getHAPreset("co2")!;
    const hits = matchEntities(preset, [
      { entityId: "sensor.temperature_only", friendlyName: "Temp" },
    ]);
    expect(hits).toEqual([]);
  });
});
