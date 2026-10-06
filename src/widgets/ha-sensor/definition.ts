import type { WidgetDefinition } from "../types";
import { HASensorEditor } from "./HASensorEditor";
import { HASensorRenderer } from "./HASensorRenderer";
import {
  HA_SENSOR_TYPE,
  haSensorConfigSchema,
  haSensorDefaultConfig,
  haSensorMetadata,
} from "./config";

export const haSensorDefinition: WidgetDefinition = {
  type: HA_SENSOR_TYPE,
  metadata: { ...haSensorMetadata },
  defaultConfig: { ...haSensorDefaultConfig },
  configSchema: haSensorConfigSchema,
  renderer: HASensorRenderer,
  editor: HASensorEditor,
};
