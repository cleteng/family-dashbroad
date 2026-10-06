import type { WidgetDefinition } from "../types";
import { ClockEditor } from "./ClockEditor";
import { ClockRenderer } from "./ClockRenderer";
import { CLOCK_TYPE, clockConfigSchema, clockDefaultConfig, clockMetadata } from "./config";

export const clockDefinition: WidgetDefinition = {
  type: CLOCK_TYPE,
  metadata: { ...clockMetadata },
  defaultConfig: { ...clockDefaultConfig },
  configSchema: clockConfigSchema,
  renderer: ClockRenderer,
  editor: ClockEditor,
};
