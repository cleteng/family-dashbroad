/**
 * Next.js instrumentation — runs once when the Node server starts.
 * Creates the first admin from env if the users table is empty.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  try {
    const { ensureAdminUser } = await import("@/lib/auth");
    const created = ensureAdminUser();
    if (created) {
      console.info(`[auth] Created initial admin: ${created.email}`);
    }
  } catch (err) {
    // Log clearly; do not crash the whole process on empty DB without env —
    // login path will surface the same requirement.
    console.error("[auth] Bootstrap:", err instanceof Error ? err.message : err);
  }
}
