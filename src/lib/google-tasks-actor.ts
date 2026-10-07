/**
 * Resolve which user owns Google Tasks for an API request.
 * Admin session preferred; else first active integration (display board).
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations } from "@/db/schema/integrations";
import { getSession } from "@/lib/session";
import { GOOGLE_INTEGRATION_TYPE } from "@/lib/google-oauth";

export function findPrimaryGoogleTasksUserId(): string | null {
  const row = db
    .select({ userId: integrations.userId })
    .from(integrations)
    .where(
      and(
        eq(integrations.type, GOOGLE_INTEGRATION_TYPE),
        eq(integrations.isActive, true),
      ),
    )
    .get();
  return row?.userId ?? null;
}

/**
 * Prefer logged-in admin; fall back to primary Google-connected user for display.
 */
export async function resolveGoogleTasksActorUserId(): Promise<string | null> {
  try {
    const session = await getSession();
    if (session.isLoggedIn && session.userId) {
      return session.userId;
    }
  } catch {
    /* ignore */
  }
  return findPrimaryGoogleTasksUserId();
}
