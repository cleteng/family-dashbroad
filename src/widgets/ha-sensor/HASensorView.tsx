"use client";

import { formatHAUpdatedRelative } from "./config";

export type HASensorPayload = {
  entityId: string;
  state: string;
  unit: string | null;
  friendlyName: string;
  lastUpdated: string | null;
};

export type HASensorViewState =
  | { kind: "loading" }
  | { kind: "no_entity" }
  | { kind: "ha_unavailable" }
  | { kind: "not_found" }
  | { kind: "error" }
  | { kind: "ready"; data: HASensorPayload };

/**
 * Presentational HA sensor card — pure props for unit tests.
 */
export function HASensorView({ view }: { view: HASensorViewState }) {
  if (view.kind === "loading") {
    return (
      <div
        className="flex h-full min-h-[100px] items-center justify-center p-4 text-sm text-zinc-400"
        data-testid="ha-sensor-widget"
        data-state="loading"
      >
        加载中…
      </div>
    );
  }

  if (view.kind === "no_entity") {
    return (
      <div
        className="flex h-full min-h-[100px] flex-col items-center justify-center gap-1 p-4 text-center"
        data-testid="ha-sensor-widget"
        data-state="no_entity"
      >
        <div className="text-sm text-zinc-400">请选择传感器</div>
      </div>
    );
  }

  if (view.kind === "ha_unavailable") {
    return (
      <div
        className="flex h-full min-h-[100px] flex-col items-center justify-center gap-1 p-4 text-center"
        data-testid="ha-sensor-widget"
        data-state="ha_unavailable"
      >
        <div className="text-2xl" aria-hidden>
          🔌
        </div>
        <div className="text-sm text-zinc-400">HA 未连接</div>
      </div>
    );
  }

  if (view.kind === "not_found") {
    return (
      <div
        className="flex h-full min-h-[100px] flex-col items-center justify-center gap-1 p-4 text-center"
        data-testid="ha-sensor-widget"
        data-state="not_found"
      >
        <div className="text-sm text-zinc-400">实体不存在</div>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div
        className="flex h-full min-h-[100px] flex-col items-center justify-center gap-1 p-4 text-center"
        data-testid="ha-sensor-widget"
        data-state="error"
      >
        <div className="text-sm text-zinc-400">暂时无法获取</div>
      </div>
    );
  }

  const { data } = view;
  const relative = formatHAUpdatedRelative(data.lastUpdated);

  return (
    <div
      className="flex h-full flex-col justify-center gap-1 p-4 text-zinc-100"
      data-testid="ha-sensor-widget"
      data-state="ready"
      data-entity-id={data.entityId}
    >
      <div
        className="truncate text-xs text-zinc-400"
        data-testid="ha-sensor-name"
        title={data.entityId}
      >
        {data.friendlyName}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-3xl font-semibold tracking-tight tabular-nums"
          data-testid="ha-sensor-state"
        >
          {data.state}
        </span>
        {data.unit ? (
          <span className="text-sm text-zinc-400" data-testid="ha-sensor-unit">
            {data.unit}
          </span>
        ) : null}
      </div>
      {relative ? (
        <div className="text-[10px] text-zinc-500" data-testid="ha-sensor-updated">
          {relative}
        </div>
      ) : null}
    </div>
  );
}
