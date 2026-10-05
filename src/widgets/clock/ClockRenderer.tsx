"use client";

import { useEffect, useMemo, useState } from "react";
import { clockDefaultConfig, type ClockConfig } from "./config";

function resolveConfig(raw: Record<string, unknown>): ClockConfig {
  return {
    timezone: typeof raw.timezone === "string" ? raw.timezone : clockDefaultConfig.timezone,
    format: raw.format === "12h" || raw.format === "24h" ? raw.format : "24h",
    showSeconds:
      typeof raw.showSeconds === "boolean" ? raw.showSeconds : clockDefaultConfig.showSeconds,
    showDate: typeof raw.showDate === "boolean" ? raw.showDate : clockDefaultConfig.showDate,
  };
}

export function ClockRenderer({ config }: { config: Record<string, unknown> }) {
  const cfg = useMemo(() => resolveConfig(config), [config]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  let timeText = "--:--";
  let dateText = "";

  try {
    const timeOpts: Intl.DateTimeFormatOptions = {
      timeZone: cfg.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: cfg.format === "12h",
    };
    if (cfg.showSeconds) timeOpts.second = "2-digit";
    timeText = new Intl.DateTimeFormat(undefined, timeOpts).format(now);

    if (cfg.showDate) {
      dateText = new Intl.DateTimeFormat(undefined, {
        timeZone: cfg.timezone,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now);
    }
  } catch {
    timeText = "--:--";
    dateText = "";
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 p-4 text-center">
      <div className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{timeText}</div>
      {cfg.showDate && dateText ? <div className="text-sm text-zinc-500">{dateText}</div> : null}
    </div>
  );
}
