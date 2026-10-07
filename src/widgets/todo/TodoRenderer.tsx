"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { mergeTodoConfig } from "./config";
import { TodoView, type TodoTask, type TodoViewState } from "./TodoView";

export function TodoRenderer({ config }: { config: Record<string, unknown> }) {
  const cfg = useMemo(() => mergeTodoConfig(config), [config]);
  const [view, setView] = useState<TodoViewState>(() =>
    cfg.listId ? { kind: "loading" } : { kind: "no_list" },
  );

  const load = useCallback(async () => {
    if (!cfg.listId) {
      setView({ kind: "no_list" });
      return;
    }
    setView((prev) => (prev.kind === "ready" ? prev : { kind: "loading" }));
    try {
      const encoded = encodeURIComponent(cfg.listId);
      const res = await fetch(`/api/google/tasks/lists/${encoded}`, {
        cache: "no-store",
      });
      if (res.status === 503) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (body.error === "NOT_CONNECTED") {
          setView({ kind: "not_connected" });
          return;
        }
        setView({ kind: "error", message: "同步失败" });
        return;
      }
      if (res.status === 401) {
        setView({ kind: "not_connected" });
        return;
      }
      if (!res.ok) {
        setView({ kind: "error", message: "同步失败" });
        return;
      }
      const json = (await res.json()) as { tasks?: TodoTask[] };
      setView({
        kind: "ready",
        tasks: json.tasks ?? [],
        syncedAt: Date.now(),
        completingId: null,
      });
    } catch {
      setView({ kind: "error", message: "同步失败" });
    }
  }, [cfg.listId]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void load();
    };
    const start = setTimeout(run, 0);
    const ms = Math.max(30, cfg.refreshInterval) * 1000;
    const id = setInterval(run, ms);
    return () => {
      cancelled = true;
      clearTimeout(start);
      clearInterval(id);
    };
  }, [load, cfg.refreshInterval]);

  const onComplete = useCallback(
    async (taskId: string) => {
      if (!cfg.listId) return;
      setView((prev) => (prev.kind === "ready" ? { ...prev, completingId: taskId } : prev));
      try {
        const listEnc = encodeURIComponent(cfg.listId);
        const taskEnc = encodeURIComponent(taskId);
        const res = await fetch(`/api/google/tasks/lists/${listEnc}/${taskEnc}/complete`, {
          method: "POST",
        });
        if (!res.ok) {
          setView((prev) => (prev.kind === "ready" ? { ...prev, completingId: null } : prev));
          return;
        }
        setView((prev) => {
          if (prev.kind !== "ready") return prev;
          return {
            ...prev,
            tasks: prev.tasks.filter((t) => t.id !== taskId),
            completingId: null,
            syncedAt: Date.now(),
          };
        });
      } catch {
        setView((prev) => (prev.kind === "ready" ? { ...prev, completingId: null } : prev));
      }
    },
    [cfg.listId],
  );

  const onCreate = useCallback(
    async (title: string) => {
      if (!cfg.listId) return;
      try {
        const listEnc = encodeURIComponent(cfg.listId);
        const res = await fetch(`/api/google/tasks/lists/${listEnc}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { task?: TodoTask };
        if (json.task) {
          setView((prev) => {
            if (prev.kind !== "ready") return prev;
            return {
              ...prev,
              tasks: [json.task!, ...prev.tasks],
              syncedAt: Date.now(),
            };
          });
        } else {
          void load();
        }
      } catch {
        /* ignore */
      }
    },
    [cfg.listId, load],
  );

  return (
    <TodoView
      view={view}
      actions={{
        onComplete,
        onCreate,
        onRetry: () => void load(),
      }}
    />
  );
}
