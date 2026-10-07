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
import { chineseAlmanacDefinition } from "./chinese-almanac/definition";
import { weatherDefinition } from "./weather/definition";
import { haSensorDefinition } from "./ha-sensor/definition";
import { todoDefinition } from "./todo/definition";

registerWidget(clockDefinition);
registerWidget(calendarDefinition);
registerWidget(chineseAlmanacDefinition);
registerWidget(weatherDefinition);
registerWidget(haSensorDefinition);
registerWidget(todoDefinition);

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
export { chineseAlmanacDefinition } from "./chinese-almanac/definition";
export { weatherDefinition } from "./weather/definition";
export { haSensorDefinition } from "./ha-sensor/definition";
export { todoDefinition } from "./todo/definition";
export {
  REGISTERED_WIDGET_TYPES,
  listWidgetConfigEntries,
  getWidgetConfigEntry,
  widgetConfigRegistry,
} from "./config-registry";
