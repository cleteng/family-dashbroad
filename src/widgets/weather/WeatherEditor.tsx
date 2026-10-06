"use client";

import { mergeWeatherConfig } from "./config";

export function WeatherEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const cfg = mergeWeatherConfig(config);

  return (
    <div className="space-y-3 text-sm" data-testid="weather-editor">
      <label className="block space-y-1">
        <span className="text-zinc-600">邮编（加拿大）</span>
        <input
          type="text"
          className="w-full rounded border border-zinc-300 px-2 py-1.5 font-mono text-sm"
          value={cfg.postalCode}
          onChange={(e) => onChange({ ...cfg, postalCode: e.target.value })}
          placeholder="J4L 3B3"
          data-testid="weather-postal"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-zinc-600">预报天数（1–7）</span>
        <input
          type="number"
          min={1}
          max={7}
          className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          value={cfg.forecastDays}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({
              ...cfg,
              forecastDays: Number.isFinite(n) ? n : cfg.forecastDays,
            });
          }}
          data-testid="weather-forecast-days"
        />
      </label>
    </div>
  );
}
