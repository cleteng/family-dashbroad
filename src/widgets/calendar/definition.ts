import type { WidgetDefinition } from "../types";
import { CalendarEditor } from "./CalendarEditor";
import { CalendarRenderer } from "./CalendarRenderer";
import {
  CALENDAR_TYPE,
  calendarConfigSchema,
  calendarDefaultConfig,
  calendarMetadata,
} from "./config";

export const calendarDefinition: WidgetDefinition = {
  type: CALENDAR_TYPE,
  metadata: { ...calendarMetadata },
  defaultConfig: { ...calendarDefaultConfig },
  configSchema: calendarConfigSchema,
  renderer: CalendarRenderer,
  editor: CalendarEditor,
};
