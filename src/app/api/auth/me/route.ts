import { NextResponse } from "next/server";
import { findUserById } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ isLoggedIn: false, user: null });
    }

    const user = findUserById(session.userId);
    if (!user) {
      session.destroy();
      return NextResponse.json({ isLoggedIn: false, user: null });
    }

    return NextResponse.json({
      isLoggedIn: true,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error("[auth/me]", err instanceof Error ? err.message : "error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
