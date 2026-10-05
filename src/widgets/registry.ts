import type { WidgetConfigDefinition, WidgetDefinition } from "./types";

const registry = new Map<string, WidgetDefinition>();

export function registerWidget(def: WidgetDefinition): void {
  registry.set(def.type, def);
}

export function getWidgetDefinition(
  type: string,
): WidgetDefinition | undefined {
  return registry.get(type);
}

export function listWidgetDefinitions(): WidgetDefinition[] {
  return Array.from(registry.values());
}

/** Config-only view for server validation / registry API (no components). */
export function getWidgetConfigDefinition(
  type: string,
): WidgetConfigDefinition | undefined {
  const def = registry.get(type);
  if (!def) return undefined;
  return {
    type: def.type,
    metadata: def.metadata,
    defaultConfig: def.defaultConfig,
    configSchema: def.configSchema,
  };
}

export function listWidgetConfigDefinitions(): WidgetConfigDefinition[] {
  return listWidgetDefinitions().map((d) => ({
    type: d.type,
    metadata: d.metadata,
    defaultConfig: d.defaultConfig,
    configSchema: d.configSchema,
  }));
}
