/**
 * Display board long-running runtime helpers (TASK-024).
 * Uses classic online/offline + visibilitychange (iPad/Safari-safe).
 */

/** CustomEvent name: widgets should re-fetch when this fires. */
export const DISPLAY_REFRESH_EVENT = "fd-display-refresh";

export type DisplayRefreshDetail = {
  reason: "online" | "visible" | "interval" | "manual";
};

export function emitDisplayRefresh(
  reason: DisplayRefreshDetail["reason"],
): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(DISPLAY_REFRESH_EVENT, {
        detail: { reason } satisfies DisplayRefreshDetail,
      }),
    );
  } catch {
    // IE-era CustomEvent quirks — ignore
  }
}

/** Default soft re-fetch cadence for the board (not per-widget). */
export const DISPLAY_BOARD_HEARTBEAT_MS = 5 * 60 * 1000; // 5 min

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  // navigator.onLine is widely supported; may be optimistic on some networks
  return navigator.onLine !== false;
}
