"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import { apiGet, apiSend } from "@/lib/api-client";
import {
  getWidgetDefinition,
  registerWidget,
} from "@/widgets/registry";
import { clockDefinition } from "@/widgets/clock/definition";
import type { Breakpoint } from "@/lib/layouts";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
// Ensure clock is registered in the browser
registerWidget(clockDefinition);
type Widget = {
  id: string;
  dashboardId: string;
  type: string;
  title: string | null;
  config: Record<string, unknown> | null;
};
type LayoutEntry = {
  widgetId: string;
  breakpoint: Breakpoint;
  x: number;
  y: number;
  w: number;
  h: number;
};
type RegistryItem = {
  type: string;
  metadata: { name: string; description: string };
  defaultConfig: Record<string, unknown>;
};
type SaveState = "idle" | "saving" | "saved" | "error";
const BP_UI: { key: Breakpoint; label: string; width: number }[] = [
  { key: "desktop", label: "电脑", width: 1200 },
  { key: "tablet", label: "平板", width: 768 },
  { key: "mobile", label: "手机", width: 390 },
];
const COLS = 12;
function layoutToGrid(
  entries: LayoutEntry[],
  bp: Breakpoint,
  widgetIds: string[],
): Layout[] {
  const forBp = entries.filter((e) => e.breakpoint === bp);
  const byId = new Map(forBp.map((e) => [e.widgetId, e]));
  return widgetIds.map((id, idx) => {
    const e = byId.get(id);
    if (e) {
      return { i: id, x: e.x, y: e.y, w: e.w, h: e.h };
    }
    // fallback position if missing
    return { i: id, x: 0, y: idx * 3, w: 4, h: 3 };
  });
}
function gridToEntries(
  layoutsByBp: Record<Breakpoint, Layout[]>,
): LayoutEntry[] {
  const out: LayoutEntry[] = [];
  for (const bp of ["desktop", "tablet", "mobile"] as Breakpoint[]) {
    for (const item of layoutsByBp[bp] ?? []) {
      out.push({
        widgetId: item.i,
        breakpoint: bp,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      });
    }
  }
  return out;
}
export function DashboardEditor({
  dashboardId,
  initialName,
}: {
  dashboardId: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [entries, setEntries] = useState<LayoutEntry[]>([]);
  const [registry, setRegistry] = useState<RegistryItem[]>([]);
  const [bp, setBp] = useState<Breakpoint>("desktop");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [settingsWidget, setSettingsWidget] = useState<Widget | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, unknown>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const load = useCallback(async () => {
    setError(null);
    try {
      const [wRes, lRes, rRes, dRes] = await Promise.all([
        apiGet<{ widgets: Widget[] }>(
          `/api/dashboards/${dashboardId}/widgets`,
        ),
        apiGet<{ layouts: LayoutEntry[] }>(
          `/api/dashboards/${dashboardId}/layout`,
        ),
        apiGet<{ widgets: RegistryItem[] }>("/api/widgets/registry"),
        apiGet<{ dashboard: { name: string } }>(
          `/api/dashboards/${dashboardId}`,
        ),
      ]);
      setWidgets(wRes.widgets);
      setEntries(lRes.layouts);
      setRegistry(rRes.widgets);
      setName(dRes.dashboard.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);
  useEffect(() => {
    void load();
  }, [load]);
  const widgetIds = useMemo(() => widgets.map((w) => w.id), [widgets]);
  const currentLayout = useMemo(
    () => layoutToGrid(entries, bp, widgetIds),
    [entries, bp, widgetIds],
  );
  const containerWidth =
    BP_UI.find((b) => b.key === bp)?.width ?? 1200;
  const persistLayout = useCallback(
    async (nextEntries: LayoutEntry[]) => {
      setSaveState("saving");
      setError(null);
      try {
        const res = await apiSend<{ layouts: LayoutEntry[] }>(
          `/api/dashboards/${dashboardId}/layout`,
          "PUT",
          { layouts: nextEntries },
        );
        setEntries(res.layouts);
        setSaveState("saved");
      } catch (e) {
        setSaveState("error");
        setError(e instanceof Error ? e.message : "布局保存失败");
      }
    },
    [dashboardId],
  );
  const scheduleSave = useCallback(
    (nextEntries: LayoutEntry[]) => {
      setEntries(nextEntries);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persistLayout(nextEntries);
      }, 800);
    },
    [persistLayout],
  );
  function onLayoutChange(layout: Layout[]) {
    // Merge into full multi-bp entries
    const byBp: Record<Breakpoint, Layout[]> = {
      desktop: layoutToGrid(entriesRef.current, "desktop", widgetIds),
      tablet: layoutToGrid(entriesRef.current, "tablet", widgetIds),
      mobile: layoutToGrid(entriesRef.current, "mobile", widgetIds),
    };
    byBp[bp] = layout.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    scheduleSave(gridToEntries(byBp));
  }
  async function onRename() {
    const next = window.prompt("看板名称", name)?.trim();
    if (!next || next === name) return;
    try {
      const res = await apiSend<{ dashboard: { name: string } }>(
        `/api/dashboards/${dashboardId}`,
        "PATCH",
        { name: next },
      );
      setName(res.dashboard.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "重命名失败");
    }
  }
  async function onAddWidget(type: string) {
    setShowAdd(false);
    try {
      const created = await apiSend<{ widget: Widget }>(
        `/api/dashboards/${dashboardId}/widgets`,
        "POST",
        { type },
      );
      const widget = created.widget;
      setWidgets((prev) => [...prev, widget]);
      // Place at bottom for all breakpoints
      const maxY = (bpKey: Breakpoint) => {
        const items = layoutToGrid(entriesRef.current, bpKey, [
          ...widgetIds,
          widget.id,
        ]);
        return items.reduce((m, it) => Math.max(m, it.y + it.h), 0);
      };
      const next: LayoutEntry[] = [...entriesRef.current];
      for (const bpKey of ["desktop", "tablet", "mobile"] as Breakpoint[]) {
        next.push({
          widgetId: widget.id,
          breakpoint: bpKey,
          x: 0,
          y: maxY(bpKey),
          w: 4,
          h: 3,
        });
      }
      setEntries(next);
      await persistLayout(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    }
  }
  async function onDeleteWidget(widget: Widget) {
    if (!window.confirm(`删除小部件「${widget.title || widget.type}」？`)) {
      return;
    }
    try {
      await apiSend(
        `/api/dashboards/${dashboardId}/widgets/${widget.id}`,
        "DELETE",
      );
      setWidgets((prev) => prev.filter((w) => w.id !== widget.id));
      const next = entriesRef.current.filter((e) => e.widgetId !== widget.id);
      setEntries(next);
      await persistLayout(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }
  function openSettings(widget: Widget) {
    setSettingsWidget(widget);
    setSettingsDraft(widget.config ?? {});
  }
  async function saveSettings() {
    if (!settingsWidget) return;
    try {
      const res = await apiSend<{ widget: Widget }>(
        `/api/dashboards/${dashboardId}/widgets/${settingsWidget.id}`,
        "PATCH",
        { config: settingsDraft },
      );
      setWidgets((prev) =>
        prev.map((w) => (w.id === res.widget.id ? res.widget : w)),
      );
      setSettingsWidget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "设置保存失败");
    }
  }
  const saveLabel =
    saveState === "saving"
      ? "保存中…"
      : saveState === "saved"
        ? "已保存 ✓"
        : saveState === "error"
          ? "保存失败"
          : "";
  if (loading) {
    return <p className="p-6 text-sm text-zinc-500">加载编辑器…</p>;
  }
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/admin"
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ← 看板列表
          </Link>
          <button
            type="button"
            onClick={() => void onRename()}
            className="text-lg font-semibold text-zinc-900 hover:underline"
            data-testid="dashboard-name"
          >
            {name}
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span
              className={`text-xs ${saveState === "error" ? "text-red-600" : "text-zinc-500"}`}
              data-testid="save-status"
            >
              {saveLabel}
            </span>
            {BP_UI.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setBp(b.key)}
                className={`rounded px-2 py-1 text-sm ${
                  bp === b.key
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 hover:bg-zinc-50"
                }`}
                data-testid={`bp-${b.key}`}
              >
                {b.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
              data-testid="add-widget"
            >
              ＋ 添加
            </button>
          </div>
        </div>
        {error ? (
          <p className="bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 p-4">
        {widgets.length === 0 ? (
          <div
            className="rounded border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500"
            data-testid="empty-widgets"
          >
            点右上角 ＋ 添加第一个小部件
          </div>
        ) : (
          <div
            className="mx-auto rounded border border-zinc-200 bg-white p-2 shadow-sm"
            style={{ width: Math.min(containerWidth, 1200) }}
            data-testid="grid-container"
          >
            <GridLayout
              className="layout"
              layout={currentLayout}
              cols={COLS}
              rowHeight={40}
              width={Math.min(containerWidth, 1200) - 16}
              onLayoutChange={onLayoutChange}
              draggableHandle=".widget-drag-handle"
            >
              {widgets.map((w) => {
                const def = getWidgetDefinition(w.type);
                const Renderer = def?.renderer;
                return (
                  <div
                    key={w.id}
                    className="overflow-hidden rounded border border-zinc-200 bg-white shadow-sm"
                    data-testid={`widget-card-${w.id}`}
                  >
                    <div className="widget-drag-handle flex cursor-move items-center justify-between border-b border-zinc-100 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
                      <span>{def?.metadata.name ?? w.type}</span>
                      <span className="flex gap-1">
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 hover:bg-zinc-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSettings(w);
                          }}
                          data-testid={`settings-${w.id}`}
                        >
                          设置
                        </button>
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDeleteWidget(w);
                          }}
                          data-testid={`delete-${w.id}`}
                        >
                          删除
                        </button>
                      </span>
                    </div>
                    <div className="min-h-[80px]">
                      {Renderer ? (
                        <Renderer config={w.config ?? {}} />
                      ) : (
                        <div className="p-4 text-sm text-zinc-400">
                          {w.type}（暂无预览）
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </GridLayout>
          </div>
        )}
      </div>
      {showAdd ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg"
            data-testid="add-widget-modal"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">添加小部件</h2>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-sm text-zinc-500"
              >
                关闭
              </button>
            </div>
            <ul className="space-y-2">
              {registry.map((item) => (
                <li key={item.type}>
                  <button
                    type="button"
                    className="w-full rounded border border-zinc-200 px-3 py-2 text-left hover:bg-zinc-50"
                    onClick={() => void onAddWidget(item.type)}
                    data-testid={`add-type-${item.type}`}
                  >
                    <div className="font-medium">{item.metadata.name}</div>
                    <div className="text-xs text-zinc-500">
                      {item.metadata.description}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {settingsWidget ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg"
            data-testid="settings-modal"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">小部件设置</h2>
              <button
                type="button"
                onClick={() => setSettingsWidget(null)}
                className="text-sm text-zinc-500"
              >
                关闭
              </button>
            </div>
            {(() => {
              const def = getWidgetDefinition(settingsWidget.type);
              const Editor = def?.editor;
              if (!Editor) {
                return (
                  <p className="text-sm text-zinc-500">此类型暂无设置面板</p>
                );
              }
              return (
                <Editor config={settingsDraft} onChange={setSettingsDraft} />
              );
            })()}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettingsWidget(null)}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void saveSettings()}
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
                data-testid="save-settings"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
