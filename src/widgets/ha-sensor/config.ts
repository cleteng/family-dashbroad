import { z } from "zod";

export const HA_SENSOR_TYPE = "ha-sensor" as const;

export const haSensorMetadata = {
  name: "HA 传感器",
  description: "显示 Home Assistant 传感器实时状态",
} as const;

export const haSensorDefaultConfig = {
  entityId: "",
  refreshInterval: 60,
};

export const haSensorConfigSchema = z.object({
  // Allow empty on create; editor requires a selection before useful display.
  entityId: z.string().optional(),
  refreshInterval: z.number().min(10).max(3600).optional(),
});

export type HASensorConfig = {
  entityId: string;
  refreshInterval: number;
};

export function mergeHASensorConfig(
  partial: Record<string, unknown> | null | undefined,
): HASensorConfig {
  const raw = partial ?? {};
  let interval: number | undefined;
  if (typeof raw.refreshInterval === "number" && Number.isFinite(raw.refreshInterval)) {
    interval = Math.min(3600, Math.max(10, Math.round(raw.refreshInterval)));
  }
  const base = {
    ...haSensorDefaultConfig,
    ...raw,
    ...(interval !== undefined ? { refreshInterval: interval } : {}),
  };
  const parsed = haSensorConfigSchema.parse(base);
  return {
    entityId:
      typeof parsed.entityId === "string" ? parsed.entityId.trim() : haSensorDefaultConfig.entityId,
    refreshInterval:
      typeof parsed.refreshInterval === "number"
        ? parsed.refreshInterval
        : haSensorDefaultConfig.refreshInterval,
  };
}

/** Relative time for last_updated ISO strings. */
export function formatHAUpdatedRelative(updatedAt: string | null, now = new Date()): string {
  if (!updatedAt) return "";
  const t = new Date(updatedAt);
  if (Number.isNaN(t.getTime())) return "";
  const diffMs = Math.max(0, now.getTime() - t.getTime());
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "刚刚更新";
  if (mins < 60) return `${mins} 分钟前更新`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前更新`;
  return `${Math.floor(hours / 24)} 天前更新`;
}
