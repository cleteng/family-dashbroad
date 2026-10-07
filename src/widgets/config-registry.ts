/**
 * Server-safe single source of truth for widget types, metadata, and config schemas.
 * No React components — safe to import from API routes and lib/.
 *
 * Full UI definitions (renderer/editor) live in src/widgets/index.ts → registry.
 */
import { CLOCK_TYPE, clockConfigSchema, clockDefaultConfig, clockMetadata } from "./clock/config";
import {
  CALENDAR_TYPE,
  calendarConfigSchema,
  calendarDefaultConfig,
  calendarMetadata,
} from "./calendar/config";
import {
  CHINESE_ALMANAC_TYPE,
  chineseAlmanacConfigSchema,
  chineseAlmanacDefaultConfig,
  chineseAlmanacMetadata,
} from "./chinese-almanac/config";
import {
  WEATHER_TYPE,
  weatherConfigSchema,
  weatherDefaultConfig,
  weatherMetadata,
} from "./weather/config";
import {
  HA_SENSOR_TYPE,
  haSensorConfigSchema,
  haSensorDefaultConfig,
  haSensorMetadata,
} from "./ha-sensor/config";
import { TODO_TYPE, todoConfigSchema, todoDefaultConfig, todoMetadata } from "./todo/config";
import type { z } from "zod";

export type WidgetConfigEntry = {
  type: string;
  metadata: { name: string; description: string; icon?: string };
  defaultConfig: Record<string, unknown>;
  configSchema: z.ZodTypeAny;
};

export const widgetConfigRegistry: Record<string, WidgetConfigEntry> = {
  [CLOCK_TYPE]: {
    type: CLOCK_TYPE,
    metadata: { ...clockMetadata },
    defaultConfig: { ...clockDefaultConfig },
    configSchema: clockConfigSchema,
  },
  [CALENDAR_TYPE]: {
    type: CALENDAR_TYPE,
    metadata: { ...calendarMetadata },
    defaultConfig: { ...calendarDefaultConfig },
    configSchema: calendarConfigSchema,
  },
  [CHINESE_ALMANAC_TYPE]: {
    type: CHINESE_ALMANAC_TYPE,
    metadata: { ...chineseAlmanacMetadata },
    defaultConfig: { ...chineseAlmanacDefaultConfig },
    configSchema: chineseAlmanacConfigSchema,
  },
  [WEATHER_TYPE]: {
    type: WEATHER_TYPE,
    metadata: { ...weatherMetadata },
    defaultConfig: { ...weatherDefaultConfig },
    configSchema: weatherConfigSchema,
  },
  [HA_SENSOR_TYPE]: {
    type: HA_SENSOR_TYPE,
    metadata: { ...haSensorMetadata },
    defaultConfig: { ...haSensorDefaultConfig },
    configSchema: haSensorConfigSchema,
  },
  [TODO_TYPE]: {
    type: TODO_TYPE,
    metadata: { ...todoMetadata },
    defaultConfig: { ...todoDefaultConfig },
    configSchema: todoConfigSchema,
  },
};

/** Registered widget type strings (whitelist for create/update). */
export const REGISTERED_WIDGET_TYPES = Object.keys(widgetConfigRegistry) as [string, ...string[]];

export function listWidgetConfigEntries(): WidgetConfigEntry[] {
  return Object.values(widgetConfigRegistry);
}

export function getWidgetConfigEntry(type: string): WidgetConfigEntry | undefined {
  return widgetConfigRegistry[type];
}
