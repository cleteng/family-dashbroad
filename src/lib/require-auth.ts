import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export type AuthedSession = {
  userId: string;
  email?: string;
};

/**
 * Require a logged-in session for API routes.
 * Returns { session } or a 401 NextResponse.
 */
export async function requireAuth(): Promise<{ session: AuthedSession } | { error: NextResponse }> {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    return {
      session: { userId: session.userId, email: session.email },
    };
  } catch {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}
