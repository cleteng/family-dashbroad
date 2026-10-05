import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/logout]", err instanceof Error ? err.message : "error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
