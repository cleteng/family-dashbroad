"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { mergeTodoConfig } from "./config";

type ListItem = { id: string; title: string };

export function TodoEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const cfg = mergeTodoConfig(config);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await apiGet<{ lists: ListItem[]; error?: string }>("/api/google/tasks/lists");
      setLists(data.lists ?? []);
      if (data.error === "NOT_CONNECTED") {
        setListError("Google 未连接");
      }
    } catch {
      setLists([]);
      setListError("无法加载任务清单（可能未连接 Google）");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = setTimeout(() => {
      if (!cancelled) void loadLists();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [loadLists]);

  return (
    <div className="space-y-3 text-sm" data-testid="todo-editor">
      <label className="block space-y-1">
        <span className="text-zinc-600">任务清单</span>
        {loading ? (
          <div className="text-xs text-zinc-400">加载清单…</div>
        ) : listError ? (
          <div className="text-xs text-red-600" data-testid="todo-list-error">
            {listError}{" "}
            <a href="/admin/settings/google" className="underline">
              去连接
            </a>
          </div>
        ) : null}
        <select
          className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          value={cfg.listId}
          onChange={(e) => onChange({ ...cfg, listId: e.target.value })}
          data-testid="todo-list-select"
        >
          <option value="">— 选择清单 —</option>
          {cfg.listId && !lists.some((l) => l.id === cfg.listId) ? (
            <option value={cfg.listId}>{cfg.listId}</option>
          ) : null}
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-zinc-600">刷新间隔（秒，30–3600）</span>
        <input
          type="number"
          min={30}
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
          data-testid="todo-refresh"
        />
      </label>
    </div>
  );
}
