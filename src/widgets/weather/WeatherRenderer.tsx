"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { mergeWeatherConfig } from "./config";
import { WeatherView, type WeatherApiPayload } from "./WeatherView";

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
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        postalCode: cfg.postalCode,
        days: String(cfg.forecastDays),
      });
      const res = await fetch(`/api/weather?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setData(null);
        setError(true);
        return;
      }
      const json = (await res.json()) as WeatherApiPayload;
      setData(json);
      setError(false);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [cfg.postalCode, cfg.forecastDays]);

  useEffect(() => {
    void load();
    // Refresh every 15 minutes (matches data-layer cache TTL)
    const id = setInterval(() => void load(), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return <WeatherView data={data} error={error} loading={loading} />;
}
