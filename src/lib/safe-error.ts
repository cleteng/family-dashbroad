/**
 * TASK-023: sanitize errors for client display / API JSON.
 * Never leak tokens, secrets, stack traces, or filesystem paths.
 */

const SENSITIVE =
  /access[_-]?token|refresh[_-]?token|bearer\s+\S+|authorization\s*:|client[_-]?secret|api[_-]?key|SESSION_SECRET|password|\/home\/|\/Users\/|node_modules|at\s+\S+\s+\(/i;

export function sanitizeErrorMessage(
  err: unknown,
  fallback = "暂时无法加载",
): string {
  if (err == null) return fallback;
  let raw = "";
  if (typeof err === "string") raw = err;
  else if (err instanceof Error) raw = err.message || "";
  else if (typeof err === "object" && "message" in err) {
    raw = String((err as { message: unknown }).message ?? "");
  }
  if (!raw.trim()) return fallback;
  if (SENSITIVE.test(raw)) return fallback;
  // Cap length; drop multi-line stacks
  const first = raw.split("\n")[0]!.trim().slice(0, 120);
  if (SENSITIVE.test(first)) return fallback;
  return first || fallback;
}

/** True if string looks like it contains secrets (for tests / guards). */
export function containsSensitiveInfo(text: string): boolean {
  return SENSITIVE.test(text);
}
