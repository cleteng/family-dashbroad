"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { mergeHASensorConfig } from "./config";

type EntityItem = {
  entityId: string;
  friendlyName: string;
  domain: string;
};

type PresetItem = {
  key: string;
  name: string;
  icon: string;
  unit: string;
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

  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [matched, setMatched] = useState<EntityItem[]>([]);
  const [matchMessage, setMatchMessage] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

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

  const loadPresets = useCallback(async () => {
    try {
      const data = await apiGet<{ presets: PresetItem[] }>("/api/ha/presets");
      setPresets(data.presets ?? []);
    } catch {
      setPresets([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = setTimeout(() => {
      if (!cancelled) {
        void loadEntities();
        void loadPresets();
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [loadEntities, loadPresets]);

  async function onPresetClick(key: string) {
    setActivePreset(key);
    setMatching(true);
    setMatchMessage(null);
    setMatched([]);
    try {
      const data = await apiGet<{
        entities: EntityItem[];
        message?: string;
      }>(`/api/ha/presets/${encodeURIComponent(key)}/match`);
      const list = data.entities ?? [];
      setMatched(list);
      if (list.length === 0) {
        setMatchMessage("未找到匹配实体，请手动选择");
      } else if (list.length === 1) {
        onChange({ ...cfg, entityId: list[0].entityId });
        setMatchMessage(`已选择：${list[0].friendlyName}`);
      } else {
        setMatchMessage(`找到 ${list.length} 个匹配，请选择`);
      }
    } catch {
      setMatched([]);
      setMatchMessage("HA 未连接或匹配失败，请手动选择");
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="space-y-3 text-sm" data-testid="ha-sensor-editor">
      <div className="space-y-1.5" data-testid="ha-sensor-presets">
        <div className="text-zinc-600">从预设添加</div>
        <div className="grid grid-cols-5 gap-1.5">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => void onPresetClick(p.key)}
              disabled={matching}
              className={
                "flex flex-col items-center gap-0.5 rounded border px-1 py-2 text-center hover:bg-zinc-50 disabled:opacity-50 " +
                (activePreset === p.key
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200")
              }
              data-testid={`ha-preset-${p.key}`}
              title={p.unit ? `${p.name} (${p.unit})` : p.name}
            >
              <span className="text-lg leading-none" aria-hidden>
                {p.icon}
              </span>
              <span className="text-[10px] leading-tight text-zinc-700">
                {p.name}
              </span>
            </button>
          ))}
        </div>
        {matching ? <div className="text-xs text-zinc-400">匹配中…</div> : null}
        {matchMessage ? (
          <div
            className="text-xs text-zinc-500"
            data-testid="ha-preset-message"
          >
            {matchMessage}
          </div>
        ) : null}
        {matched.length > 1 ? (
          <select
            className="w-full rounded border border-zinc-300 px-2 py-1.5 font-mono text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onChange({ ...cfg, entityId: e.target.value });
                setMatchMessage(`已选择：${e.target.value}`);
              }
            }}
            data-testid="ha-preset-match-select"
          >
            <option value="">— 选择匹配的实体 —</option>
            {matched.map((e) => (
              <option key={e.entityId} value={e.entityId}>
                {e.friendlyName} ({e.entityId})
              </option>
            ))}
          </select>
        ) : null}
      </div>

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
