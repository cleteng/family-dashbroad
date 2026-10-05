import type { WidgetDefinition } from "../types";
import { ClockEditor } from "./ClockEditor";
import { ClockRenderer } from "./ClockRenderer";
import {
  CLOCK_TYPE,
  clockConfigSchema,
  clockDefaultConfig,
} from "./config";

export const clockDefinition: WidgetDefinition = {
  type: CLOCK_TYPE,
  metadata: {
    name: "时钟",
    description: "显示当前时间与日期",
  },
  defaultConfig: { ...clockDefaultConfig },
  configSchema: clockConfigSchema,
  renderer: ClockRenderer,
  editor: ClockEditor,
};
