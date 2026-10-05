/**
 * Widget package entry — registers built-in widgets on import.
 *
 * To add a new widget:
 * 1. Create src/widgets/<name>/ with config.ts, Renderer, Editor, definition.ts
 * 2. Import the definition here and call registerWidget(def)
 * 3. Add the type string to WIDGET_TYPES in src/lib/widgets.ts if needed
 */
import { registerWidget } from "./registry";
import { clockDefinition } from "./clock/definition";

registerWidget(clockDefinition);

export {
  registerWidget,
  getWidgetDefinition,
  listWidgetDefinitions,
  getWidgetConfigDefinition,
  listWidgetConfigDefinitions,
} from "./registry";
export type { WidgetDefinition, WidgetConfigDefinition } from "./types";
export { clockDefinition } from "./clock/definition";
export { clockConfigSchema, clockDefaultConfig, mergeClockConfig } from "./clock/config";
