import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  completeTask,
  googleTasksErrorHttpStatus,
  isGoogleTasksError,
} from "@/lib/google-tasks";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string; taskId: string }> };

/**
 * POST /api/google/tasks/lists/[id]/[taskId]/complete
 */
export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const params = await ctx.params;
  let listId = params.id;
  let taskId = params.taskId;
  try {
    listId = decodeURIComponent(params.id);
  } catch {
    /* keep */
  }
  try {
    taskId = decodeURIComponent(params.taskId);
  } catch {
    /* keep */
  }

  if (!listId.trim() || !taskId.trim()) {
    return NextResponse.json(
      { error: "INVALID_ARGUMENT", message: "listId 或 taskId 无效" },
      { status: 400 },
    );
  }

  try {
    await completeTask(auth.session.userId, listId, taskId);
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
