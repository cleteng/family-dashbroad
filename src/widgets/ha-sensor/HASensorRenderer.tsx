"use client";

import { useCallback, useMemo, useState } from "react";
import { useDisplayDataRefresh } from "@/hooks/useDisplayRuntime";
import { mergeHASensorConfig } from "./config";
import {
  HASensorView,
  type HASensorPayload,
  type HASensorViewState,
} from "./HASensorView";

export function HASensorRenderer({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const cfg = useMemo(() => mergeHASensorConfig(config), [config]);
  const [view, setView] = useState<HASensorViewState>(() =>
    cfg.entityId ? { kind: "loading" } : { kind: "no_entity" },
  );

  const load = useCallback(async () => {
    if (!cfg.entityId) {
      setView({ kind: "no_entity" });
      return;
    }
    setView((prev) => (prev.kind === "ready" ? prev : { kind: "loading" }));
    try {
      const encoded = encodeURIComponent(cfg.entityId);
      const res = await fetch(`/api/ha/states/${encoded}`, {
        cache: "no-store",
      });
      if (res.status === 503) {
        // Keep last good reading if any
        setView((prev) =>
          prev.kind === "ready" ? prev : { kind: "ha_unavailable" },
        );
        return;
      }
      if (res.status === 404) {
        setView({ kind: "not_found" });
        return;
      }
      if (!res.ok) {
        setView((prev) => (prev.kind === "ready" ? prev : { kind: "error" }));
        return;
      }
      const json = (await res.json()) as HASensorPayload;
      setView({ kind: "ready", data: json });
    } catch {
      setView((prev) => (prev.kind === "ready" ? prev : { kind: "error" }));
    }
  }, [cfg.entityId]);

  const intervalMs = Math.max(10, cfg.refreshInterval) * 1000;
  useDisplayDataRefresh(load, intervalMs);

  return <HASensorView view={view} />;
}
