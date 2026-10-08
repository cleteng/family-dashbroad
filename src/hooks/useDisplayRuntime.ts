"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DISPLAY_BOARD_HEARTBEAT_MS,
  DISPLAY_REFRESH_EVENT,
  emitDisplayRefresh,
  isBrowserOnline,
  type DisplayRefreshDetail,
} from "@/lib/display-runtime";

/**
 * Board-level online tracking + refresh broadcasts for long-running Display.
 */
export function useDisplayOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(isBrowserOnline());

    function onOnline() {
      setOnline(true);
      emitDisplayRefresh("online");
    }
    function onOffline() {
      setOnline(false);
    }
    function onVisible() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        emitDisplayRefresh("visible");
      }
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    const heartbeat = window.setInterval(() => {
      if (isBrowserOnline()) {
        emitDisplayRefresh("interval");
      }
    }, DISPLAY_BOARD_HEARTBEAT_MS);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(heartbeat);
    };
  }, []);

  return online;
}

/**
 * Subscribe a widget to board refresh events (and optional local interval).
 * `load` should keep last-good data on failure.
 */
export function useDisplayDataRefresh(
  load: () => void | Promise<void>,
  intervalMs: number | null,
): void {
  const stableLoad = useCallback(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void stableLoad();
    };

    const start = window.setTimeout(run, 0);

    function onRefresh(ev: Event) {
      const detail = (ev as CustomEvent<DisplayRefreshDetail>).detail;
      // Skip interval reason if widget has its own interval (avoid double fire)
      if (
        detail?.reason === "interval" &&
        intervalMs != null &&
        intervalMs > 0
      ) {
        return;
      }
      run();
    }

    window.addEventListener(DISPLAY_REFRESH_EVENT, onRefresh);

    let id: number | undefined;
    if (intervalMs != null && intervalMs > 0) {
      id = window.setInterval(run, intervalMs);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.removeEventListener(DISPLAY_REFRESH_EVENT, onRefresh);
      if (id != null) window.clearInterval(id);
    };
  }, [stableLoad, intervalMs]);
}
