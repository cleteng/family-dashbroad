"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { mergeHASensorConfig } from "./config";

type EntityItem = {
  entityId: string;
  friendlyName: string;
  domain: string;
};

export function HASensorEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const cfg = mergeHASensorConfig(config);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const loadEntities = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await apiGet<{ entities: EntityItem[] }>("/api/ha/states");
      setEntities(data.entities ?? []);
    } catch {
      setEntities([]);
      setListError("HA 未连接，无法加载实体列表");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = setTimeout(() => {
      if (!cancelled) void loadEntities();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [loadEntities]);

  return (
    <div className="space-y-3 text-sm" data-testid="ha-sensor-editor">
      <label className="block space-y-1">
        <span className="text-zinc-600">传感器实体</span>
        {loadingList ? (
          <div className="text-xs text-zinc-400">加载实体列表…</div>
        ) : listError ? (
          <div
            className="text-xs text-red-600"
            data-testid="ha-sensor-list-error"
          >
            {listError}
          </div>
        ) : null}
        <select
          className="w-full rounded border border-zinc-300 px-2 py-1.5 font-mono text-sm"
          value={cfg.entityId}
          onChange={(e) => onChange({ ...cfg, entityId: e.target.value })}
          data-testid="ha-sensor-entity"
        >
          <option value="">— 选择实体 —</option>
          {cfg.entityId &&
          !entities.some((e) => e.entityId === cfg.entityId) ? (
            <option value={cfg.entityId}>{cfg.entityId}</option>
          ) : null}
          {entities.map((e) => (
            <option key={e.entityId} value={e.entityId}>
              {e.friendlyName} ({e.entityId})
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-zinc-600">刷新间隔（秒，10–3600）</span>
        <input
          type="number"
          min={10}
          max={3600}
          className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          value={cfg.refreshInterval}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({
              ...cfg,
              refreshInterval: Number.isFinite(n) ? n : cfg.refreshInterval,
            });
          }}
          data-testid="ha-sensor-refresh"
        />
      </label>
    </div>
  );
}
