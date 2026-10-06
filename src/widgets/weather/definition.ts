import type { WidgetDefinition } from "../types";
import { WeatherEditor } from "./WeatherEditor";
import { WeatherRenderer } from "./WeatherRenderer";
import {
  WEATHER_TYPE,
  weatherConfigSchema,
  weatherDefaultConfig,
  weatherMetadata,
} from "./config";

export const weatherDefinition: WidgetDefinition = {
  type: WEATHER_TYPE,
  metadata: { ...weatherMetadata },
  defaultConfig: { ...weatherDefaultConfig },
  configSchema: weatherConfigSchema,
  renderer: WeatherRenderer,
  editor: WeatherEditor,
};
