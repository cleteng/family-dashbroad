import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GoogleTasksError,
  googleTasksErrorHttpStatus,
} from "@/lib/google-tasks";

vi.mock("@/lib/require-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/google-tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/google-tasks")>();
  return {
    ...actual,
    listTaskLists: vi.fn(),
    listTasks: vi.fn(),
    createTask: vi.fn(),
    completeTask: vi.fn(),
  };
});

import { requireAuth } from "@/lib/require-auth";
import {
  listTaskLists,
  listTasks,
  createTask,
  completeTask,
} from "@/lib/google-tasks";
import { GET as getLists } from "@/app/api/google/tasks/lists/route";
import {
  GET as getTasks,
  POST as postTask,
} from "@/app/api/google/tasks/lists/[id]/route";
import { POST as postComplete } from "@/app/api/google/tasks/lists/[id]/[taskId]/complete/route";

const requireAuthMock = vi.mocked(requireAuth);
const listTaskListsMock = vi.mocked(listTaskLists);
const listTasksMock = vi.mocked(listTasks);
const createTaskMock = vi.mocked(createTask);
const completeTaskMock = vi.mocked(completeTask);

function authed() {
  requireAuthMock.mockResolvedValue({
    session: { userId: "user-1", email: "a@example.com" },
  });
}

function unauthed() {
  requireAuthMock.mockResolvedValue({
    error: Response.json({ error: "Unauthorized" }, { status: 401 }) as never,
  });
}

describe("googleTasksErrorHttpStatus", () => {
  it("maps codes to HTTP status", () => {
    expect(
      googleTasksErrorHttpStatus(new GoogleTasksError("NOT_CONNECTED", "x")),
    ).toBe(503);
    expect(
      googleTasksErrorHttpStatus(new GoogleTasksError("UNAUTHORIZED", "x")),
    ).toBe(401);
    expect(
      googleTasksErrorHttpStatus(new GoogleTasksError("INVALID_ARGUMENT", "x")),
    ).toBe(400);
    expect(
      googleTasksErrorHttpStatus(new GoogleTasksError("API_ERROR", "x")),
    ).toBe(502);
  });
});

describe("GET /api/google/tasks/lists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not logged in", async () => {
    unauthed();
    const res = await getLists();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/access_token|refresh_token|Bearer/);
  });

  it("returns lists when authed", async () => {
    authed();
    listTaskListsMock.mockResolvedValue([{ id: "L1", title: "Personal" }]);
    const res = await getLists();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lists).toEqual([{ id: "L1", title: "Personal" }]);
    expect(listTaskListsMock).toHaveBeenCalledWith("user-1");
    expect(JSON.stringify(body)).not.toMatch(/access_token|refresh_token/);
  });

  it("maps NOT_CONNECTED to 503", async () => {
    authed();
    listTaskListsMock.mockRejectedValue(
      new GoogleTasksError("NOT_CONNECTED", "Google 未连接"),
    );
    const res = await getLists();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("NOT_CONNECTED");
    expect(JSON.stringify(body)).not.toMatch(/access_token|Bearer /);
  });
});

describe("GET /api/google/tasks/lists/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 when unauthenticated", async () => {
    unauthed();
    const res = await getTasks(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns tasks", async () => {
    authed();
    listTasksMock.mockResolvedValue([
      {
        id: "t1",
        title: "Buy",
        status: "needsAction",
        updated: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const res = await getTasks(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toHaveLength(1);
    expect(listTasksMock).toHaveBeenCalledWith("user-1", "L1");
  });

  it("maps UNAUTHORIZED to 401", async () => {
    authed();
    listTasksMock.mockRejectedValue(
      new GoogleTasksError("UNAUTHORIZED", "未授权"),
    );
    const res = await getTasks(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1" }),
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/google/tasks/lists/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("400 when title missing (Zod)", async () => {
    authed();
    const req = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ notes: "only notes" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postTask(req, {
      params: Promise.resolve({ id: "L1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ARGUMENT");
    expect(createTaskMock).not.toHaveBeenCalled();
  });

  it("creates task when body valid", async () => {
    authed();
    createTaskMock.mockResolvedValue({
      id: "new1",
      title: "Buy milk",
      status: "needsAction",
      updated: "2026-01-01T00:00:00.000Z",
    });
    const req = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({
        title: "Buy milk",
        due: "2026-10-10T12:00:00.000Z",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postTask(req, {
      params: Promise.resolve({ id: "L1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.task.title).toBe("Buy milk");
    expect(createTaskMock).toHaveBeenCalledWith("user-1", "L1", "Buy milk", {
      due: "2026-10-10T12:00:00.000Z",
      notes: undefined,
    });
  });
});

describe("POST .../complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 when unauthenticated", async () => {
    unauthed();
    const res = await postComplete(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1", taskId: "T1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns success", async () => {
    authed();
    completeTaskMock.mockResolvedValue(undefined);
    const res = await postComplete(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1", taskId: "T1" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(completeTaskMock).toHaveBeenCalledWith("user-1", "L1", "T1");
  });

  it("maps API_ERROR to 502", async () => {
    authed();
    completeTaskMock.mockRejectedValue(
      new GoogleTasksError("API_ERROR", "Google Tasks API 错误 (404)"),
    );
    const res = await postComplete(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1", taskId: "missing" }),
    });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("API_ERROR");
  });
});
