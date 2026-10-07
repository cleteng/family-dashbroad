/**
 * Google Tasks data layer (TASK-020).
 * Reuses TASK-019 getValidAccessToken — does not implement OAuth.
 */

const TASKS_API = "https://tasks.googleapis.com/tasks/v1";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PAGES = 50;

export interface TaskList {
  id: string;
  title: string;
}

export interface TaskItem {
  id: string;
  title: string;
  due?: string;
  notes?: string;
  status: "needsAction" | "completed";
  updated: string;
}

export type GoogleTasksErrorCode =
  | "NOT_CONNECTED"
  | "UNAUTHORIZED"
  | "API_ERROR"
  | "INVALID_ARGUMENT";

export class GoogleTasksError extends Error {
  readonly code: GoogleTasksErrorCode;

  constructor(code: GoogleTasksErrorCode, message: string) {
    super(message);
    this.name = "GoogleTasksError";
    this.code = code;
  }
}

type FetchLike = typeof fetch;

type TokenResolver = (
  userId: string,
  fetchImpl?: FetchLike,
) => Promise<string | null>;

/** Injectable for tests; default lazily uses TASK-019 getValidAccessToken. */
let tokenResolver: TokenResolver | null = null;

async function defaultTokenResolver(
  userId: string,
  fetchImpl?: FetchLike,
): Promise<string | null> {
  const { getValidAccessToken } = await import("@/lib/google-oauth");
  return getValidAccessToken(userId, fetchImpl);
}

export function setGoogleTasksTokenResolverForTests(
  resolver: TokenResolver | null,
): void {
  tokenResolver = resolver;
}

function resolveToken(
  userId: string,
  fetchImpl: FetchLike,
): Promise<string | null> {
  const r = tokenResolver ?? defaultTokenResolver;
  return r(userId, fetchImpl);
}

async function requireAccessToken(
  userId: string,
  fetchImpl: FetchLike,
): Promise<string> {
  const token = await resolveToken(userId, fetchImpl);
  if (!token) {
    throw new GoogleTasksError("NOT_CONNECTED", "Google 未连接");
  }
  return token;
}

async function tasksFetch(
  userId: string,
  path: string,
  init: RequestInit,
  fetchImpl: FetchLike,
): Promise<Response> {
  const token = await requireAccessToken(userId, fetchImpl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return await fetchImpl(`${TASKS_API}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function mapHttpError(status: number): never {
  if (status === 401 || status === 403) {
    throw new GoogleTasksError("UNAUTHORIZED", "未授权");
  }
  throw new GoogleTasksError("API_ERROR", `Google Tasks API 错误 (${status})`);
}

async function fetchAllPages<T>(
  userId: string,
  pathWithQuery: string,
  extract: (body: Record<string, unknown>) => T[],
  fetchImpl: FetchLike,
): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  while (pages < MAX_PAGES) {
    pages += 1;
    const sep = pathWithQuery.includes("?") ? "&" : "?";
    const url =
      pageToken !== undefined
        ? `${pathWithQuery}${sep}pageToken=${encodeURIComponent(pageToken)}`
        : pathWithQuery;

    const res = await tasksFetch(userId, url, { method: "GET" }, fetchImpl);
    if (!res.ok) mapHttpError(res.status);

    let body: Record<string, unknown>;
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      throw new GoogleTasksError("API_ERROR", "无效的 Google Tasks 响应");
    }

    items.push(...extract(body));
    const next =
      typeof body.nextPageToken === "string" ? body.nextPageToken : undefined;
    if (!next) break;
    pageToken = next;
  }

  return items;
}

function mapTaskList(raw: Record<string, unknown>): TaskList | null {
  if (typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  return { id: raw.id, title: raw.title };
}

function mapTaskItem(raw: Record<string, unknown>): TaskItem | null {
  if (typeof raw.id !== "string") return null;
  // Only accept known Google Tasks statuses; ignore unknown values.
  if (raw.status !== "needsAction" && raw.status !== "completed") {
    return null;
  }
  const status = raw.status;
  const item: TaskItem = {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : "",
    status,
    updated:
      typeof raw.updated === "string"
        ? raw.updated
        : new Date(0).toISOString(),
  };
  if (typeof raw.due === "string" && raw.due) item.due = raw.due;
  if (typeof raw.notes === "string" && raw.notes) item.notes = raw.notes;
  return item;
}

/**
 * List all task lists for the user (pagination handled internally).
 */
export async function listTaskLists(
  userId: string,
  fetchImpl: FetchLike = fetch,
): Promise<TaskList[]> {
  const rows = await fetchAllPages(
    userId,
    "/users/@me/lists?maxResults=100",
    (body) => {
      const items = Array.isArray(body.items) ? body.items : [];
      const out: TaskList[] = [];
      for (const row of items) {
        if (row && typeof row === "object") {
          const m = mapTaskList(row as Record<string, unknown>);
          if (m) out.push(m);
        }
      }
      return out;
    },
    fetchImpl,
  );
  return rows;
}

/**
 * List incomplete tasks in a list (pagination + filter needsAction).
 */
export async function listTasks(
  userId: string,
  listId: string,
  fetchImpl: FetchLike = fetch,
): Promise<TaskItem[]> {
  if (!listId.trim()) {
    throw new GoogleTasksError("INVALID_ARGUMENT", "listId 无效");
  }
  const encoded = encodeURIComponent(listId.trim());
  const rows = await fetchAllPages(
    userId,
    `/lists/${encoded}/tasks?maxResults=100&showCompleted=true&showHidden=false`,
    (body) => {
      const items = Array.isArray(body.items) ? body.items : [];
      const out: TaskItem[] = [];
      for (const row of items) {
        if (row && typeof row === "object") {
          const m = mapTaskItem(row as Record<string, unknown>);
          if (m) out.push(m);
        }
      }
      return out;
    },
    fetchImpl,
  );
  return rows.filter((t) => t.status === "needsAction");
}

/**
 * Mark task completed.
 */
export async function completeTask(
  userId: string,
  listId: string,
  taskId: string,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  if (!listId.trim() || !taskId.trim()) {
    throw new GoogleTasksError("INVALID_ARGUMENT", "listId 或 taskId 无效");
  }
  const path = `/lists/${encodeURIComponent(listId.trim())}/tasks/${encodeURIComponent(taskId.trim())}`;
  const res = await tasksFetch(
    userId,
    path,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    },
    fetchImpl,
  );
  if (!res.ok) mapHttpError(res.status);
}

/**
 * Create a task. title required (non-whitespace).
 */
export async function createTask(
  userId: string,
  listId: string,
  title: string,
  opts?: { due?: string; notes?: string },
  fetchImpl: FetchLike = fetch,
): Promise<TaskItem> {
  if (!listId.trim()) {
    throw new GoogleTasksError("INVALID_ARGUMENT", "listId 无效");
  }
  const trimmed = title.trim();
  if (!trimmed) {
    throw new GoogleTasksError("INVALID_ARGUMENT", "title 不能为空");
  }

  const body: Record<string, string> = { title: trimmed };
  if (opts?.due?.trim()) body.due = opts.due.trim();
  if (opts?.notes !== undefined) body.notes = opts.notes;

  const path = `/lists/${encodeURIComponent(listId.trim())}/tasks`;
  const res = await tasksFetch(
    userId,
    path,
    { method: "POST", body: JSON.stringify(body) },
    fetchImpl,
  );
  if (!res.ok) mapHttpError(res.status);

  let raw: Record<string, unknown>;
  try {
    raw = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new GoogleTasksError("API_ERROR", "无效的 Google Tasks 响应");
  }
  const mapped = mapTaskItem(raw);
  if (!mapped) {
    throw new GoogleTasksError("API_ERROR", "无法解析新建任务");
  }
  return mapped;
}

/** Map provider error → HTTP status for API routes. */
export function googleTasksErrorHttpStatus(err: GoogleTasksError): number {
  switch (err.code) {
    case "NOT_CONNECTED":
      return 503;
    case "UNAUTHORIZED":
      return 401;
    case "INVALID_ARGUMENT":
      return 400;
    case "API_ERROR":
    default:
      return 502;
  }
}

export function isGoogleTasksError(err: unknown): err is GoogleTasksError {
  return err instanceof GoogleTasksError;
}
