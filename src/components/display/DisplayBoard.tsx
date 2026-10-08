"use client";

import { useEffect, useMemo, useState } from "react";
import { useDisplayOnline } from "@/hooks/useDisplayRuntime";
import { getWidgetDefinition } from "@/widgets/registry";
import { WidgetErrorBoundary } from "@/components/WidgetErrorBoundary";
import "@/widgets"; // register all built-in widgets
import type { Breakpoint } from "@/lib/layouts";
import type { DisplayLayoutEntry, DisplayWidget } from "@/lib/display-tokens";

function pickBreakpoint(width: number): Breakpoint {
  if (width >= 1024) return "desktop";
  if (width >= 640) return "tablet";
  return "mobile";
}

export function DisplayBoard({
  widgets,
  layouts,
}: {
  widgets: DisplayWidget[];
  layouts: DisplayLayoutEntry[];
}) {
  const [bp, setBp] = useState<Breakpoint>("desktop");
  const online = useDisplayOnline();

  useEffect(() => {
    function update() {
      setBp(pickBreakpoint(window.innerWidth));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const layoutMap = useMemo(() => {
    const map = new Map<string, DisplayLayoutEntry>();
    for (const e of layouts) {
      if (e.breakpoint === bp) map.set(e.widgetId, e);
    }
    return map;
  }, [layouts, bp]);

  if (widgets.length === 0) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-zinc-400"
        data-testid="display-empty"
      >
        看板还没有小部件，请去 Admin 添加
      </div>
    );
  }

  // CSS grid 12 cols; place items by x/y/w/h (1-based grid-column/row)
  // Use absolute positioning within a relative grid sized by max y+h
  const maxBottom = widgets.reduce((m, w) => {
    const e = layoutMap.get(w.id);
    if (!e) return m;
    return Math.max(m, e.y + e.h);
  }, 4);

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-black p-2 text-white"
      data-testid="display-board"
      data-breakpoint={bp}
      data-online={online ? "1" : "0"}
    >
      {!online ? (
        <div
          className="mb-2 rounded border border-amber-800/60 bg-amber-950/50 px-3 py-1.5 text-center text-xs text-amber-200"
          data-testid="display-offline-banner"
          role="status"
        >
          网络已断开 · 显示上次数据 · 恢复后将自动同步
        </div>
      ) : null}
      <div
        className="relative mx-auto w-full max-w-[1600px]"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gridAutoRows: "minmax(40px, auto)",
          gap: "8px",
          minHeight: `${maxBottom * 48}px`,
        }}
      >
        {widgets.map((w) => {
          const e = layoutMap.get(w.id);
          const col = e ? e.x + 1 : 1;
          const row = e ? e.y + 1 : 1;
          const colSpan = e ? e.w : 4;
          const rowSpan = e ? e.h : 3;
          const def = getWidgetDefinition(w.type);
          const Renderer = def?.renderer;

          return (
            <div
              key={w.id}
              data-testid={`display-widget-${w.id}`}
              data-widget-type={w.type}
              className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
              style={{
                gridColumn: `${col} / span ${colSpan}`,
                gridRow: `${row} / span ${rowSpan}`,
              }}
            >
              {Renderer ? (
                <WidgetErrorBoundary widgetType={w.type}>
                  <Renderer config={w.config ?? {}} />
                </WidgetErrorBoundary>
              ) : (
                <div
                  className="flex h-full min-h-[80px] items-center justify-center p-4 text-sm text-zinc-500"
                  data-testid="unsupported-widget"
                >
                  暂不支持
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
