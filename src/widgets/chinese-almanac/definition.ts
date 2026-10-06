import type { WidgetDefinition } from "../types";
import { AlmanacEditor } from "./AlmanacEditor";
import { AlmanacRenderer } from "./AlmanacRenderer";
import {
  CHINESE_ALMANAC_TYPE,
  chineseAlmanacConfigSchema,
  chineseAlmanacDefaultConfig,
  chineseAlmanacMetadata,
} from "./config";

export const chineseAlmanacDefinition: WidgetDefinition = {
  type: CHINESE_ALMANAC_TYPE,
  metadata: { ...chineseAlmanacMetadata },
  defaultConfig: { ...chineseAlmanacDefaultConfig },
  configSchema: chineseAlmanacConfigSchema,
  renderer: AlmanacRenderer,
  editor: AlmanacEditor,
};
