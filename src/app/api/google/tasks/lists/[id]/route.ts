import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveGoogleTasksActorUserId } from "@/lib/google-tasks-actor";
import {
  createTask,
  googleTasksErrorHttpStatus,
  isGoogleTasksError,
  listTasksCached,
} from "@/lib/google-tasks";

export const dynamic = "force-dynamic";

const createBodySchema = z.object({
  title: z.string().min(1),
  due: z.string().optional(),
  notes: z.string().optional(),
});

type RouteCtx = { params: Promise<{ id: string }> };

function decodeId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * GET /api/google/tasks/lists/[id] → { tasks } incomplete only
 */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const userId = await resolveGoogleTasksActorUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "NOT_CONNECTED", message: "Google 未连接", tasks: [] },
      { status: 503 },
    );
  }

  const listId = decodeId((await ctx.params).id).trim();
  if (!listId) {
    return NextResponse.json(
      { error: "INVALID_ARGUMENT", message: "listId 无效" },
      { status: 400 },
    );
  }

  try {
    const hit = await listTasksCached(userId, listId);
    return NextResponse.json({
      tasks: hit.data,
      fetchedAt: new Date(hit.fetchedAt).toISOString(),
      stale: hit.stale,
    });
  } catch (err) {
    if (isGoogleTasksError(err)) {
      return NextResponse.json(
        { error: err.code, message: err.message, tasks: [] },
        { status: googleTasksErrorHttpStatus(err) },
      );
    }
    return NextResponse.json(
      { error: "API_ERROR", message: "请求失败", tasks: [] },
      { status: 502 },
    );
  }
}

/**
 * POST /api/google/tasks/lists/[id] → { task }
 */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const userId = await resolveGoogleTasksActorUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "NOT_CONNECTED", message: "Google 未连接" },
      { status: 503 },
    );
  }

  const listId = decodeId((await ctx.params).id).trim();
  if (!listId) {
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
    const task = await createTask(userId, listId, parsed.data.title, {
      due: parsed.data.due,
      notes: parsed.data.notes,
    });
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
