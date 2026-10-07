import { NextResponse } from "next/server";
import { resolveGoogleTasksActorUserId } from "@/lib/google-tasks-actor";
import { googleTasksErrorHttpStatus, isGoogleTasksError, listTaskLists } from "@/lib/google-tasks";

export const dynamic = "force-dynamic";

/**
 * GET /api/google/tasks/lists → { lists }
 * Admin session or primary Google user (display board).
 */
export async function GET() {
  const userId = await resolveGoogleTasksActorUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "NOT_CONNECTED", message: "Google 未连接", lists: [] },
      { status: 503 },
    );
  }

  try {
    const lists = await listTaskLists(userId);
    return NextResponse.json({ lists });
  } catch (err) {
    if (isGoogleTasksError(err)) {
      return NextResponse.json(
        { error: err.code, message: err.message, lists: [] },
        { status: googleTasksErrorHttpStatus(err) },
      );
    }
    return NextResponse.json(
      { error: "API_ERROR", message: "请求失败", lists: [] },
      { status: 502 },
    );
  }
}
