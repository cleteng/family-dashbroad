import { NextRequest, NextResponse } from "next/server";
import { resolveGoogleTasksActorUserId } from "@/lib/google-tasks-actor";
import {
  completeTask,
  googleTasksErrorHttpStatus,
  isGoogleTasksError,
} from "@/lib/google-tasks";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string; taskId: string }> };

function decodeId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * POST /api/google/tasks/lists/[id]/[taskId]/complete
 */
export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const userId = await resolveGoogleTasksActorUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "NOT_CONNECTED", message: "Google 未连接" },
      { status: 503 },
    );
  }

  const params = await ctx.params;
  const listId = decodeId(params.id).trim();
  const taskId = decodeId(params.taskId).trim();
  if (!listId || !taskId) {
    return NextResponse.json(
      { error: "INVALID_ARGUMENT", message: "listId 或 taskId 无效" },
      { status: 400 },
    );
  }

  try {
    await completeTask(userId, listId, taskId);
    return NextResponse.json({ success: true });
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
