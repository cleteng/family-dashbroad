import { z } from "zod";

export const TODO_TYPE = "todo" as const;

export const todoMetadata = {
  name: "待办",
  description: "显示 Google Tasks 待办并支持勾选完成",
} as const;

export const todoDefaultConfig = {
  listId: "",
  refreshInterval: 300,
};

export const todoConfigSchema = z.object({
  listId: z.string().optional(),
  refreshInterval: z.number().min(30).max(3600).optional(),
});

export type TodoConfig = {
  listId: string;
  refreshInterval: number;
};

export function mergeTodoConfig(
  partial: Record<string, unknown> | null | undefined,
): TodoConfig {
  const raw = partial ?? {};
  let interval: number | undefined;
  if (
    typeof raw.refreshInterval === "number" &&
    Number.isFinite(raw.refreshInterval)
  ) {
    interval = Math.min(3600, Math.max(30, Math.round(raw.refreshInterval)));
  }
  return {
    listId: typeof raw.listId === "string" ? raw.listId : "",
    refreshInterval: interval ?? todoDefaultConfig.refreshInterval,
  };
}

/** Relative sync label. */
export function formatSyncRelative(
  syncedAt: number | null,
  now = Date.now(),
): string {
  if (syncedAt == null) return "";
  const mins = Math.floor(Math.max(0, now - syncedAt) / 60_000);
  if (mins < 1) return "刚刚同步";
  if (mins < 60) return `${mins} 分钟前同步`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前同步`;
  return `${Math.floor(hours / 24)} 天前同步`;
}
