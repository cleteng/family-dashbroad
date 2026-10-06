/**
 * Widget package entry — registers built-in widgets on import.
 *
 * To add a new widget:
 * 1. Create src/widgets/<name>/ with config.ts, Renderer, Editor, definition.ts
 * 2. Add config entry to src/widgets/config-registry.ts
 * 3. Import definition here and call registerWidget(def)
 */
import { registerWidget } from "./registry";
import { clockDefinition } from "./clock/definition";
import { calendarDefinition } from "./calendar/definition";

registerWidget(clockDefinition);
registerWidget(calendarDefinition);

export {
  registerWidget,
  getWidgetDefinition,
  listWidgetDefinitions,
  getWidgetConfigDefinition,
  listWidgetConfigDefinitions,
} from "./registry";
export type { WidgetDefinition, WidgetConfigDefinition } from "./types";
export { clockDefinition } from "./clock/definition";
export { calendarDefinition } from "./calendar/definition";
export {
  REGISTERED_WIDGET_TYPES,
  listWidgetConfigEntries,
  getWidgetConfigEntry,
  widgetConfigRegistry,
} from "./config-registry";
