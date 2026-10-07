import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  googleTasksErrorHttpStatus,
  isGoogleTasksError,
  listTaskLists,
} from "@/lib/google-tasks";

export const dynamic = "force-dynamic";

/**
 * GET /api/google/tasks/lists → TaskList[]
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const lists = await listTaskLists(auth.session.userId);
    return NextResponse.json({ lists });
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
