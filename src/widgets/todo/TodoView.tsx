"use client";

import { formatSyncRelative } from "./config";

export type TodoTask = {
  id: string;
  title: string;
  due?: string;
  notes?: string;
  status: "needsAction" | "completed";
  updated: string;
};

export type TodoViewState =
  | { kind: "loading" }
  | { kind: "no_list" }
  | { kind: "not_connected" }
  | { kind: "error"; message?: string }
  | {
      kind: "ready";
      tasks: TodoTask[];
      syncedAt: number;
      completingId?: string | null;
    };

export type TodoViewActions = {
  onComplete?: (taskId: string) => void;
  onCreate?: (title: string) => void;
  onRetry?: () => void;
};

/**
 * Presentational todo card — pure props for unit tests.
 */
export function TodoView({ view, actions }: { view: TodoViewState; actions?: TodoViewActions }) {
  if (view.kind === "loading") {
    return (
      <div
        className="flex h-full min-h-[120px] items-center justify-center p-4 text-sm text-zinc-400"
        data-testid="todo-widget"
        data-state="loading"
      >
        同步中…
      </div>
    );
  }

  if (view.kind === "no_list") {
    return (
      <div
        className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1 p-4 text-center"
        data-testid="todo-widget"
        data-state="no_list"
      >
        <div className="text-sm text-zinc-400">请选择任务清单</div>
      </div>
    );
  }

  if (view.kind === "not_connected") {
    return (
      <div
        className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 p-4 text-center"
        data-testid="todo-widget"
        data-state="not_connected"
      >
        <div className="text-2xl" aria-hidden>
          📋
        </div>
        <div className="text-sm text-zinc-500">Google 未连接</div>
        <a
          href="/admin/settings/google"
          className="text-sm text-zinc-900 underline underline-offset-2"
          data-testid="todo-connect-link"
        >
          去连接 Google
        </a>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div
        className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 p-4 text-center"
        data-testid="todo-widget"
        data-state="error"
      >
        <div className="text-sm text-zinc-500">{view.message || "同步失败"}</div>
        {actions?.onRetry ? (
          <button
            type="button"
            onClick={actions.onRetry}
            className="text-sm text-zinc-900 underline underline-offset-2"
            data-testid="todo-retry"
          >
            点重试
          </button>
        ) : null}
      </div>
    );
  }

  // ready
  return (
    <div
      className="flex h-full min-h-[120px] flex-col p-3"
      data-testid="todo-widget"
      data-state="ready"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500">待办</span>
        <span className="text-[10px] text-zinc-400" data-testid="todo-sync-label">
          {formatSyncRelative(view.syncedAt)}
        </span>
      </div>

      {view.tasks.length === 0 ? (
        <div
          className="flex flex-1 items-center justify-center text-sm text-zinc-400"
          data-testid="todo-empty"
        >
          暂无待办
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto" data-testid="todo-list">
          {view.tasks.map((t) => {
            const completing = view.completingId === t.id;
            return (
              <li
                key={t.id}
                className={
                  "flex items-start gap-2 rounded border border-zinc-100 bg-white px-2 py-1.5 transition-opacity " +
                  (completing ? "opacity-40" : "")
                }
                data-testid={`todo-item-${t.id}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                  checked={false}
                  disabled={completing || !actions?.onComplete}
                  onChange={() => actions?.onComplete?.(t.id)}
                  aria-label={`完成 ${t.title}`}
                  data-testid={`todo-check-${t.id}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-zinc-900">{t.title}</div>
                  {t.due ? (
                    <div className="text-[10px] text-zinc-400" data-testid={`todo-due-${t.id}`}>
                      截止 {t.due.slice(0, 10)}
                    </div>
                  ) : null}
                  {t.notes ? (
                    <div className="truncate text-[10px] text-zinc-400">{t.notes}</div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {actions?.onCreate ? (
        <form
          className="mt-2 border-t border-zinc-100 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const title = String(fd.get("title") ?? "").trim();
            if (title) {
              actions.onCreate?.(title);
              e.currentTarget.reset();
            }
          }}
          data-testid="todo-create-form"
        >
          <input
            name="title"
            type="text"
            placeholder="新建任务，回车添加"
            className="w-full rounded border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400"
            data-testid="todo-create-input"
            autoComplete="off"
          />
        </form>
      ) : null}
    </div>
  );
}
