import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GoogleTasksError,
  googleTasksErrorHttpStatus,
} from "@/lib/google-tasks";

vi.mock("@/lib/google-tasks-actor", () => ({
  resolveGoogleTasksActorUserId: vi.fn(),
  findPrimaryGoogleTasksUserId: vi.fn(),
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

import { resolveGoogleTasksActorUserId } from "@/lib/google-tasks-actor";
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

const resolveActor = vi.mocked(resolveGoogleTasksActorUserId);
const listTaskListsMock = vi.mocked(listTaskLists);
const listTasksMock = vi.mocked(listTasks);
const createTaskMock = vi.mocked(createTask);
const completeTaskMock = vi.mocked(completeTask);

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

  it("503 NOT_CONNECTED when no actor user", async () => {
    resolveActor.mockResolvedValue(null);
    const res = await getLists();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("NOT_CONNECTED");
    expect(JSON.stringify(body)).not.toMatch(
      /access_token|refresh_token|Bearer/,
    );
  });

  it("returns lists when actor present", async () => {
    resolveActor.mockResolvedValue("user-1");
    listTaskListsMock.mockResolvedValue([{ id: "L1", title: "Personal" }]);
    const res = await getLists();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lists).toEqual([{ id: "L1", title: "Personal" }]);
    expect(listTaskListsMock).toHaveBeenCalledWith("user-1");
  });

  it("maps NOT_CONNECTED from provider to 503", async () => {
    resolveActor.mockResolvedValue("user-1");
    listTaskListsMock.mockRejectedValue(
      new GoogleTasksError("NOT_CONNECTED", "Google 未连接"),
    );
    const res = await getLists();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("NOT_CONNECTED");
  });
});

describe("GET /api/google/tasks/lists/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("503 when no actor", async () => {
    resolveActor.mockResolvedValue(null);
    const res = await getTasks(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1" }),
    });
    expect(res.status).toBe(503);
  });

  it("returns tasks", async () => {
    resolveActor.mockResolvedValue("user-1");
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
    expect((await res.json()).tasks).toHaveLength(1);
  });

  it("maps UNAUTHORIZED to 401", async () => {
    resolveActor.mockResolvedValue("user-1");
    listTasksMock.mockRejectedValue(
      new GoogleTasksError("UNAUTHORIZED", "未授权"),
    );
    const res = await getTasks(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/google/tasks/lists/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("400 when title missing (Zod)", async () => {
    resolveActor.mockResolvedValue("user-1");
    const req = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ notes: "only notes" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postTask(req, {
      params: Promise.resolve({ id: "L1" }),
    });
    expect(res.status).toBe(400);
    expect(createTaskMock).not.toHaveBeenCalled();
  });

  it("creates task when body valid", async () => {
    resolveActor.mockResolvedValue("user-1");
    createTaskMock.mockResolvedValue({
      id: "new1",
      title: "Buy milk",
      status: "needsAction",
      updated: "2026-01-01T00:00:00.000Z",
    });
    const req = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ title: "Buy milk" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postTask(req, {
      params: Promise.resolve({ id: "L1" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).task.title).toBe("Buy milk");
  });
});

describe("POST .../complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("503 when no actor", async () => {
    resolveActor.mockResolvedValue(null);
    const res = await postComplete(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1", taskId: "T1" }),
    });
    expect(res.status).toBe(503);
  });

  it("returns success", async () => {
    resolveActor.mockResolvedValue("user-1");
    completeTaskMock.mockResolvedValue(undefined);
    const res = await postComplete(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ id: "L1", taskId: "T1" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
