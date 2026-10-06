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
};

/** Registered widget type strings (whitelist for create/update). */
export const REGISTERED_WIDGET_TYPES = Object.keys(widgetConfigRegistry) as [string, ...string[]];

export function listWidgetConfigEntries(): WidgetConfigEntry[] {
  return Object.values(widgetConfigRegistry);
}

export function getWidgetConfigEntry(type: string): WidgetConfigEntry | undefined {
  return widgetConfigRegistry[type];
}
