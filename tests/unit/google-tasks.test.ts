import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  completeTask,
  createTask,
  GoogleTasksError,
  listTaskLists,
  listTasks,
  setGoogleTasksTokenResolverForTests,
} from "@/lib/google-tasks";

const USER = "user-test-1";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("google-tasks provider", () => {
  beforeEach(() => {
    setGoogleTasksTokenResolverForTests(async () => "access-token-test");
  });

  afterEach(() => {
    setGoogleTasksTokenResolverForTests(null);
  });

  describe("listTaskLists", () => {
    it("returns lists and handles empty", async () => {
      const fetchMock: typeof fetch = async () => jsonResponse({ items: [] });
      await expect(listTaskLists(USER, fetchMock)).resolves.toEqual([]);
    });

    it("returns mapped lists", async () => {
      const fetchMock: typeof fetch = async (url) => {
        expect(String(url)).toContain("/users/@me/lists");
        expect(String(url)).toContain("tasks.googleapis.com");
        return jsonResponse({
          items: [
            { id: "L1", title: "Personal" },
            { id: "L2", title: "Work" },
          ],
        });
      };
      const lists = await listTaskLists(USER, fetchMock);
      expect(lists).toEqual([
        { id: "L1", title: "Personal" },
        { id: "L2", title: "Work" },
      ]);
    });

    it("follows pagination", async () => {
      let calls = 0;
      const fetchMock: typeof fetch = async (url) => {
        calls += 1;
        const u = String(url);
        if (calls === 1) {
          expect(u).not.toContain("pageToken=");
          return jsonResponse({
            items: [{ id: "L1", title: "A" }],
            nextPageToken: "tok2",
          });
        }
        expect(u).toContain("pageToken=tok2");
        return jsonResponse({
          items: [{ id: "L2", title: "B" }],
        });
      };
      const lists = await listTaskLists(USER, fetchMock);
      expect(lists.map((l) => l.id)).toEqual(["L1", "L2"]);
      expect(calls).toBe(2);
    });

    it("401 → UNAUTHORIZED", async () => {
      const fetchMock: typeof fetch = async () =>
        new Response("{}", { status: 401 });
      await expect(listTaskLists(USER, fetchMock)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("500 → API_ERROR", async () => {
      const fetchMock: typeof fetch = async () =>
        new Response("{}", { status: 500 });
      await expect(listTaskLists(USER, fetchMock)).rejects.toMatchObject({
        code: "API_ERROR",
      });
    });
  });

  describe("listTasks", () => {
    it("filters to needsAction only", async () => {
      const fetchMock: typeof fetch = async (url) => {
        expect(String(url)).toContain("/lists/LIST1/tasks");
        return jsonResponse({
          items: [
            {
              id: "t1",
              title: "Open",
              status: "needsAction",
              updated: "2026-01-01T00:00:00.000Z",
            },
            {
              id: "t2",
              title: "Done",
              status: "completed",
              updated: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      };
      const tasks = await listTasks(USER, "LIST1", fetchMock);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe("t1");
      expect(tasks[0].status).toBe("needsAction");
    });

    it("empty list → []", async () => {
      const fetchMock: typeof fetch = async () => jsonResponse({});
      await expect(listTasks(USER, "LIST1", fetchMock)).resolves.toEqual([]);
    });

    it("pagination merges pages", async () => {
      let calls = 0;
      const fetchMock: typeof fetch = async () => {
        calls += 1;
        if (calls === 1) {
          return jsonResponse({
            items: [
              {
                id: "t1",
                title: "A",
                status: "needsAction",
                updated: "2026-01-01T00:00:00.000Z",
              },
            ],
            nextPageToken: "p2",
          });
        }
        return jsonResponse({
          items: [
            {
              id: "t2",
              title: "B",
              status: "needsAction",
              updated: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      };
      const tasks = await listTasks(USER, "L", fetchMock);
      expect(tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
    });
  });

  describe("completeTask", () => {
    it("PATCH status completed", async () => {
      const fetchMock: typeof fetch = async (url, init) => {
        expect(String(url)).toContain("/lists/L1/tasks/T1");
        expect((init as RequestInit).method).toBe("PATCH");
        const body = JSON.parse(String((init as RequestInit).body));
        expect(body).toEqual({ status: "completed" });
        const headers = new Headers((init as RequestInit).headers);
        expect(headers.get("Authorization")).toBe("Bearer access-token-test");
        return jsonResponse({ id: "T1", status: "completed" });
      };
      await expect(
        completeTask(USER, "L1", "T1", fetchMock),
      ).resolves.toBeUndefined();
    });

    it("404 → API_ERROR", async () => {
      const fetchMock: typeof fetch = async () =>
        new Response("{}", { status: 404 });
      await expect(
        completeTask(USER, "L1", "missing", fetchMock),
      ).rejects.toMatchObject({
        code: "API_ERROR",
      });
    });
  });

  describe("createTask", () => {
    it("posts title due notes", async () => {
      const fetchMock: typeof fetch = async (url, init) => {
        expect(String(url)).toContain("/lists/L1/tasks");
        expect((init as RequestInit).method).toBe("POST");
        const body = JSON.parse(String((init as RequestInit).body));
        expect(body).toEqual({
          title: "Buy milk",
          due: "2026-10-10T12:00:00.000Z",
          notes: "2L",
        });
        return jsonResponse({
          id: "new1",
          title: "Buy milk",
          status: "needsAction",
          due: "2026-10-10T12:00:00.000Z",
          notes: "2L",
          updated: "2026-10-07T00:00:00.000Z",
        });
      };
      const task = await createTask(
        USER,
        "L1",
        "Buy milk",
        { due: "2026-10-10T12:00:00.000Z", notes: "2L" },
        fetchMock,
      );
      expect(task.id).toBe("new1");
      expect(task.title).toBe("Buy milk");
      expect(task.due).toBe("2026-10-10T12:00:00.000Z");
    });

    it("rejects empty title", async () => {
      await expect(createTask(USER, "L1", "   ")).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });

    it("401 → UNAUTHORIZED", async () => {
      const fetchMock: typeof fetch = async () =>
        new Response("{}", { status: 401 });
      await expect(
        createTask(USER, "L1", "x", undefined, fetchMock),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("auth", () => {
    it("NOT_CONNECTED when no token", async () => {
      setGoogleTasksTokenResolverForTests(async () => null);
      await expect(
        listTaskLists(USER, async () => jsonResponse({})),
      ).rejects.toMatchObject({
        code: "NOT_CONNECTED",
      });
      await expect(
        listTaskLists(USER, async () => jsonResponse({})),
      ).rejects.toBeInstanceOf(GoogleTasksError);
    });
  });
});
