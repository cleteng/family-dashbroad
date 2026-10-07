import type { WidgetDefinition } from "../types";
import { TodoEditor } from "./TodoEditor";
import { TodoRenderer } from "./TodoRenderer";
import {
  TODO_TYPE,
  todoConfigSchema,
  todoDefaultConfig,
  todoMetadata,
} from "./config";

export const todoDefinition: WidgetDefinition = {
  type: TODO_TYPE,
  metadata: { ...todoMetadata },
  defaultConfig: { ...todoDefaultConfig },
  configSchema: todoConfigSchema,
  renderer: TodoRenderer,
  editor: TodoEditor,
};
