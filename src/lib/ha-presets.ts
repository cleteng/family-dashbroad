/**
 * Environment presets for HA sensor widget (TASK-018).
 * Keyword match is case-insensitive substring on entity_id + friendly_name.
 */

export type HAPresetKey =
  | "temperature"
  | "humidity"
  | "co2"
  | "pm25"
  | "air-quality";

export interface HAPreset {
  key: HAPresetKey;
  name: string;
  icon: string;
  unit: string;
  matchKeywords: string[];
}

/** Minimal entity shape for matching (compatible with HAEntityListItem). */
export type HAPresetEntity = {
  entityId: string;
  friendlyName: string;
  domain?: string;
};

export const HA_PRESETS: readonly HAPreset[] = [
  {
    key: "temperature",
    name: "温度",
    icon: "🌡️",
    unit: "°C",
    matchKeywords: ["temperature", "temp", "温度", "气温"],
  },
  {
    key: "humidity",
    name: "湿度",
    icon: "💧",
    unit: "%",
    matchKeywords: ["humidity", "humid", "湿度"],
  },
  {
    key: "co2",
    name: "CO2",
    icon: "🫧",
    unit: "ppm",
    matchKeywords: ["co2", "carbon_dioxide", "二氧化碳"],
  },
  {
    key: "pm25",
    name: "PM2.5",
    icon: "🌫️",
    unit: "µg/m³",
    matchKeywords: ["pm25", "pm2_5", "pm2.5", "pm_2_5"],
  },
  {
    key: "air-quality",
    name: "空气质量",
    icon: "🍃",
    unit: "",
    matchKeywords: ["air_quality", "airquality", "aqi", "空气质量"],
  },
] as const;

export function getHAPreset(key: string): HAPreset | undefined {
  return HA_PRESETS.find((p) => p.key === key);
}

/**
 * Case-insensitive partial match: keyword appears in entity_id or friendly_name.
 * Returns matches sorted by friendlyName.
 */
export function matchEntities(
  preset: HAPreset,
  entities: HAPresetEntity[],
): HAPresetEntity[] {
  const keywords = preset.matchKeywords.map((k) => k.toLowerCase());
  const matched = entities.filter((e) => {
    const hay = `${e.entityId} ${e.friendlyName}`.toLowerCase();
    return keywords.some((kw) => hay.includes(kw));
  });
  return matched
    .slice()
    .sort((a, b) => a.friendlyName.localeCompare(b.friendlyName, "zh"));
}
