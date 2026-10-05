import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser, ensureAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Ensure first admin exists if table empty (idempotent when already seeded)
    try {
      ensureAdminUser();
    } catch {
      // If env missing and no users, login will simply fail with generic error
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const limited = checkRateLimit(`login:${ip}`, 5, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: limited.retryAfterSec
            ? { "Retry-After": String(limited.retryAfterSec) }
            : undefined,
        },
      );
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "邮箱或密码错误" },
        { status: 401 },
      );
    }

    const user = authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return NextResponse.json(
        { error: "邮箱或密码错误" },
        { status: 401 },
      );
    }

    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error("[auth/login]", err instanceof Error ? err.message : "error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
