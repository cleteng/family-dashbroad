import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import {
  createTask,
  googleTasksErrorHttpStatus,
  isGoogleTasksError,
  listTasks,
} from "@/lib/google-tasks";

export const dynamic = "force-dynamic";

const createBodySchema = z.object({
  title: z.string().min(1),
  due: z.string().optional(),
  notes: z.string().optional(),
});

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * GET /api/google/tasks/lists/[id] → incomplete TaskItem[]
 */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: rawId } = await ctx.params;
  let listId = rawId;
  try {
    listId = decodeURIComponent(rawId);
  } catch {
    listId = rawId;
  }

  if (!listId.trim()) {
    return NextResponse.json(
      { error: "INVALID_ARGUMENT", message: "listId 无效" },
      { status: 400 },
    );
  }

  try {
    const tasks = await listTasks(auth.session.userId, listId);
    return NextResponse.json({ tasks });
  } catch (err) {
    if (isGoogleTasksError(err)) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: googleTasksErrorHttpStatus(err) },
      );
    }
    return NextResponse.json(
      { error: "API_ERROR", message: "请求失败" },
      { status: 502 },
    );
  }
}

/**
 * POST /api/google/tasks/lists/[id] → create TaskItem
 */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: rawId } = await ctx.params;
  let listId = rawId;
  try {
    listId = decodeURIComponent(rawId);
  } catch {
    listId = rawId;
  }

  if (!listId.trim()) {
    return NextResponse.json(
      { error: "INVALID_ARGUMENT", message: "listId 无效" },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_ARGUMENT", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_ARGUMENT", message: "title 必填" },
      { status: 400 },
    );
  }

  try {
    const task = await createTask(
      auth.session.userId,
      listId,
      parsed.data.title,
      { due: parsed.data.due, notes: parsed.data.notes },
    );
    return NextResponse.json({ task });
  } catch (err) {
    if (isGoogleTasksError(err)) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: googleTasksErrorHttpStatus(err) },
      );
    }
    return NextResponse.json(
      { error: "API_ERROR", message: "请求失败" },
      { status: 502 },
    );
  }
}
