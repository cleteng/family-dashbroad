import type { ComponentType } from "react";
import type { z } from "zod";

export type WidgetDefinition = {
  type: string;
  metadata: {
    name: string;
    description: string;
    icon?: string;
  };
  defaultConfig: Record<string, unknown>;
  configSchema: z.ZodTypeAny;
  /** Optional external data source (Weather/HA). Not used by Clock. */
  dataProvider?: unknown;
  renderer: ComponentType<{ config: Record<string, unknown> }>;
  editor: ComponentType<{
    config: Record<string, unknown>;
    onChange: (c: Record<string, unknown>) => void;
  }>;
};

/** Server-safe subset used for API validation (no React components). */
export type WidgetConfigDefinition = {
  type: string;
  metadata: WidgetDefinition["metadata"];
  defaultConfig: Record<string, unknown>;
  configSchema: z.ZodTypeAny;
};
