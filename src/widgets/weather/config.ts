import { z } from "zod";

export const WEATHER_TYPE = "weather" as const;

export const weatherMetadata = {
  name: "天气",
  description: "当前天气与逐日预报（Open-Meteo）",
} as const;

export const weatherDefaultConfig = {
  postalCode: "J4L 3B3",
  forecastDays: 3,
};

export const weatherConfigSchema = z.object({
  postalCode: z.string().optional(),
  forecastDays: z.number().min(1).max(7).optional(),
});

export type WeatherConfig = {
  postalCode: string;
  forecastDays: number;
};

export function mergeWeatherConfig(
  partial: Record<string, unknown> | null | undefined,
): WeatherConfig {
  const raw = partial ?? {};
  // Clamp forecastDays before schema parse so out-of-range values don't throw.
  let forecastDaysInput: number | undefined;
  if (
    typeof raw.forecastDays === "number" &&
    Number.isFinite(raw.forecastDays)
  ) {
    forecastDaysInput = Math.min(7, Math.max(1, Math.round(raw.forecastDays)));
  }
  const base = {
    ...weatherDefaultConfig,
    ...raw,
    ...(forecastDaysInput !== undefined
      ? { forecastDays: forecastDaysInput }
      : {}),
  };
  const parsed = weatherConfigSchema.parse(base);
  return {
    postalCode:
      typeof parsed.postalCode === "string" && parsed.postalCode.trim()
        ? parsed.postalCode.trim()
        : weatherDefaultConfig.postalCode,
    forecastDays:
      typeof parsed.forecastDays === "number"
        ? parsed.forecastDays
        : weatherDefaultConfig.forecastDays,
  };
}

/** WMO icon key → emoji for display (no external assets). */
export const WEATHER_ICON_EMOJI: Record<string, string> = {
  clear: "☀️",
  "mainly-clear": "🌤️",
  "partly-cloudy": "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  rain: "🌧️",
  snow: "❄️",
  showers: "🌦️",
  "snow-showers": "🌨️",
  thunderstorm: "⛈️",
  unknown: "🌡️",
};

export function weatherIconEmoji(icon: string): string {
  return WEATHER_ICON_EMOJI[icon] ?? WEATHER_ICON_EMOJI.unknown;
}

/** Relative time in Chinese, e.g. "10 分钟前更新". */
export function formatUpdatedRelative(
  updatedAt: Date | string,
  now = new Date(),
): string {
  const t = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const diffMs = Math.max(0, now.getTime() - t.getTime());
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "刚刚更新";
  if (mins < 60) return `${mins} 分钟前更新`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前更新`;
  const days = Math.floor(hours / 24);
  return `${days} 天前更新`;
}
