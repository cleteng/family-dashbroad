"use client";

import { formatUpdatedRelative, weatherIconEmoji } from "./config";

/** Serializable payload from /api/weather (dates as ISO strings). */
export type WeatherApiPayload = {
  location: { lat: number; lon: number; name: string };
  now: {
    temperature: number;
    feelsLike: number;
    condition: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    updatedAt: string;
    stale: boolean;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
  }>;
};

function formatTemp(n: number): string {
  return `${Math.round(n)}°`;
}

function weekdayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(d);
  } catch {
    return dateStr.slice(5);
  }
}

/**
 * Presentational weather card — pure props, no fetch.
 * Used by WeatherRenderer and unit tests.
 */
export function WeatherView({
  data,
  error,
  loading,
}: {
  data: WeatherApiPayload | null;
  error?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div
        className="flex h-full min-h-[120px] items-center justify-center p-4 text-sm text-zinc-400"
        data-testid="weather-widget"
        data-state="loading"
      >
        加载中…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1 p-4 text-center"
        data-testid="weather-widget"
        data-state="unavailable"
      >
        <div className="text-2xl" aria-hidden>
          🌡️
        </div>
        <div className="text-sm text-zinc-400">天气暂不可用</div>
      </div>
    );
  }

  const { now, forecast, location } = data;
  const relative = formatUpdatedRelative(now.updatedAt);

  return (
    <div
      className="flex h-full flex-col gap-3 p-3 text-zinc-100"
      data-testid="weather-widget"
      data-state="ready"
      data-stale={now.stale ? "true" : "false"}
    >
      {/* Current */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-zinc-400" data-testid="weather-location">
            {location.name}
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span
              className="text-4xl font-semibold tracking-tight tabular-nums"
              data-testid="weather-temp"
            >
              {formatTemp(now.temperature)}
            </span>
            <span className="text-2xl" data-testid="weather-icon" aria-hidden>
              {weatherIconEmoji(now.icon)}
            </span>
          </div>
          <div className="mt-1 text-sm text-zinc-300" data-testid="weather-condition">
            {now.condition}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-400">
            <span data-testid="weather-feels">体感 {formatTemp(now.feelsLike)}</span>
            <span data-testid="weather-humidity">湿度 {Math.round(now.humidity)}%</span>
            <span data-testid="weather-wind">风速 {Math.round(now.windSpeed)} km/h</span>
          </div>
        </div>
      </div>

      {/* Forecast */}
      {forecast.length > 0 ? (
        <div
          className="grid gap-1 border-t border-zinc-800 pt-2"
          style={{
            gridTemplateColumns: `repeat(${forecast.length}, minmax(0, 1fr))`,
          }}
          data-testid="weather-forecast"
        >
          {forecast.map((day) => (
            <div
              key={day.date}
              className="flex flex-col items-center gap-0.5 px-0.5 text-center"
              data-testid="weather-forecast-day"
            >
              <div className="text-[10px] text-zinc-400">{weekdayLabel(day.date)}</div>
              <div className="text-base" aria-hidden>
                {weatherIconEmoji(day.icon)}
              </div>
              <div className="text-[11px] tabular-nums">
                <span className="text-zinc-100">{Math.round(day.high)}°</span>
                <span className="text-zinc-500"> / </span>
                <span className="text-zinc-400">{Math.round(day.low)}°</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Updated */}
      <div className="mt-auto text-[10px] text-zinc-500" data-testid="weather-updated">
        {now.stale ? `缓存 · ${relative}` : relative}
      </div>
    </div>
  );
}
