"use client";

import { useCallback, useMemo, useState } from "react";
import { mergeWeatherConfig } from "./config";
import { WeatherView, type WeatherApiPayload } from "./WeatherView";
import { useDisplayDataRefresh } from "@/hooks/useDisplayRuntime";

const REFRESH_MS = 15 * 60 * 1000;

export function WeatherRenderer({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const cfg = useMemo(() => mergeWeatherConfig(config), [config]);
  const [data, setData] = useState<WeatherApiPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        postalCode: cfg.postalCode,
        days: String(cfg.forecastDays),
      });
      const res = await fetch(`/api/weather?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = (await res.json()) as WeatherApiPayload;
      setData(json);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [cfg.postalCode, cfg.forecastDays]);

  useDisplayDataRefresh(load, REFRESH_MS);

  return (
    <WeatherView
      data={data}
      error={error && !data}
      loading={loading && !data}
    />
  );
}
