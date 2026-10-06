"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
        setView({ kind: "ha_unavailable" });
        return;
      }
      if (res.status === 404) {
        setView({ kind: "not_found" });
        return;
      }
      if (!res.ok) {
        setView({ kind: "error" });
        return;
      }
      const json = (await res.json()) as HASensorPayload;
      setView({ kind: "ready", data: json });
    } catch {
      setView({ kind: "error" });
    }
  }, [cfg.entityId]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void load();
    };
    const start = setTimeout(run, 0);
    const ms = Math.max(10, cfg.refreshInterval) * 1000;
    const id = setInterval(run, ms);
    return () => {
      cancelled = true;
      clearTimeout(start);
      clearInterval(id);
    };
  }, [load, cfg.refreshInterval]);

  return <HASensorView view={view} />;
}
