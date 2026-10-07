import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TodoView, type TodoTask } from "@/widgets/todo/TodoView";
import { mergeTodoConfig, formatSyncRelative } from "@/widgets/todo/config";

const sample: TodoTask[] = [
  {
    id: "t1",
    title: "Buy milk",
    due: "2026-10-10T12:00:00.000Z",
    notes: "2L",
    status: "needsAction",
    updated: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "t2",
    title: "Call mom",
    status: "needsAction",
    updated: "2026-10-01T00:00:00.000Z",
  },
];

describe("mergeTodoConfig", () => {
  it("defaults and clamps refresh", () => {
    expect(mergeTodoConfig({})).toEqual({
      listId: "",
      refreshInterval: 300,
    });
    expect(mergeTodoConfig({ listId: "L1", refreshInterval: 10 }).refreshInterval).toBe(30);
    expect(mergeTodoConfig({ listId: "L1", refreshInterval: 99999 }).refreshInterval).toBe(3600);
  });
});

describe("formatSyncRelative", () => {
  it("formats minutes", () => {
    const now = 1_000_000;
    expect(formatSyncRelative(now - 30_000, now)).toBe("刚刚同步");
    expect(formatSyncRelative(now - 5 * 60_000, now)).toBe("5 分钟前同步");
  });
});

describe("TodoView", () => {
  it("renders task list", () => {
    const html = renderToStaticMarkup(
      <TodoView view={{ kind: "ready", tasks: sample, syncedAt: Date.now() }} />,
    );
    expect(html).toContain("Buy milk");
    expect(html).toContain("Call mom");
    expect(html).toContain('data-testid="todo-list"');
  });

  it("shows empty state", () => {
    const html = renderToStaticMarkup(
      <TodoView view={{ kind: "ready", tasks: [], syncedAt: Date.now() }} />,
    );
    expect(html).toContain("暂无待办");
    expect(html).toContain('data-state="ready"');
  });

  it("shows not_connected guide", () => {
    const html = renderToStaticMarkup(<TodoView view={{ kind: "not_connected" }} />);
    expect(html).toContain("Google 未连接");
    expect(html).toContain("去连接 Google");
    expect(html).toContain("/admin/settings/google");
  });

  it("shows loading / error with retry", () => {
    const loading = renderToStaticMarkup(<TodoView view={{ kind: "loading" }} />);
    expect(loading).toContain("同步中");
    const onRetry = vi.fn();
    const err = renderToStaticMarkup(
      <TodoView view={{ kind: "error", message: "同步失败" }} actions={{ onRetry }} />,
    );
    expect(err).toContain("点重试");
  });

  it("renders complete checkboxes when onComplete provided", () => {
    const onComplete = vi.fn();
    const html = renderToStaticMarkup(
      <TodoView
        view={{ kind: "ready", tasks: sample, syncedAt: Date.now() }}
        actions={{ onComplete }}
      />,
    );
    expect(html).toContain('data-testid="todo-check-t1"');
    expect(html).toContain('type="checkbox"');
  });

  it("renders create form when onCreate provided", () => {
    const html = renderToStaticMarkup(
      <TodoView
        view={{ kind: "ready", tasks: [], syncedAt: Date.now() }}
        actions={{ onCreate: vi.fn() }}
      />,
    );
    expect(html).toContain('data-testid="todo-create-form"');
    expect(html).toContain('data-testid="todo-create-input"');
  });
});
