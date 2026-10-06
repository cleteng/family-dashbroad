import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  WEATHER_TYPE,
  formatUpdatedRelative,
  mergeWeatherConfig,
  weatherConfigSchema,
  weatherDefaultConfig,
  weatherIconEmoji,
} from "@/widgets/weather/config";
import {
  WeatherView,
  type WeatherApiPayload,
} from "@/widgets/weather/WeatherView";
import {
  REGISTERED_WIDGET_TYPES,
  getWidgetConfigEntry,
} from "@/widgets/config-registry";

const sampleData: WeatherApiPayload = {
  location: { lat: 45.53, lon: -73.52, name: "Longueuil" },
  now: {
    temperature: 12.4,
    feelsLike: 10.1,
    condition: "Partly Cloudy",
    icon: "partly-cloudy",
    humidity: 68,
    windSpeed: 15.2,
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    stale: false,
  },
  forecast: [
    {
      date: "2026-10-06",
      high: 14,
      low: 6,
      condition: "Clear",
      icon: "clear",
    },
    {
      date: "2026-10-07",
      high: 11,
      low: 4,
      condition: "Rain",
      icon: "rain",
    },
    {
      date: "2026-10-08",
      high: 9,
      low: 3,
      condition: "Cloudy",
      icon: "cloudy",
    },
  ],
};

describe("weather config registry", () => {
  it("registers weather type", () => {
    expect(REGISTERED_WIDGET_TYPES).toContain(WEATHER_TYPE);
    const entry = getWidgetConfigEntry(WEATHER_TYPE);
    expect(entry?.metadata.name).toBe("天气");
    expect(entry?.defaultConfig.postalCode).toBe("J4L 3B3");
  });
});

describe("weatherConfigSchema", () => {
  it("accepts defaults", () => {
    const r = weatherConfigSchema.safeParse(weatherDefaultConfig);
    expect(r.success).toBe(true);
  });

  it("rejects forecastDays out of range", () => {
    expect(weatherConfigSchema.safeParse({ forecastDays: 0 }).success).toBe(
      false,
    );
    expect(weatherConfigSchema.safeParse({ forecastDays: 8 }).success).toBe(
      false,
    );
  });
});

describe("mergeWeatherConfig", () => {
  it("fills defaults", () => {
    const c = mergeWeatherConfig({});
    expect(c.postalCode).toBe("J4L 3B3");
    expect(c.forecastDays).toBe(3);
  });

  it("clamps forecastDays", () => {
    expect(mergeWeatherConfig({ forecastDays: 99 }).forecastDays).toBe(7);
    expect(mergeWeatherConfig({ forecastDays: -1 }).forecastDays).toBe(1);
  });
});

describe("formatUpdatedRelative", () => {
  it("shows minutes", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    const updated = new Date("2026-10-06T11:50:00Z");
    expect(formatUpdatedRelative(updated, now)).toBe("10 分钟前更新");
  });

  it("shows just now", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    expect(formatUpdatedRelative(now, now)).toBe("刚刚更新");
  });
});

describe("weatherIconEmoji", () => {
  it("maps known icons", () => {
    expect(weatherIconEmoji("clear")).toBe("☀️");
    expect(weatherIconEmoji("rain")).toBe("🌧️");
    expect(weatherIconEmoji("nope")).toBe("🌡️");
  });
});

describe("WeatherView", () => {
  it("renders temperature, icon, and forecast days", () => {
    const html = renderToString(
      React.createElement(WeatherView, { data: sampleData }),
    );
    expect(html).toContain("weather-widget");
    expect(html).toContain("12°");
    expect(html).toContain("Partly Cloudy");
    expect(html).toContain("Longueuil");
    expect(html).toContain("体感");
    expect(html).toContain("湿度");
    expect(html).toContain("风速");
    // 3 forecast days
    const dayMatches = html.match(/weather-forecast-day/g) ?? [];
    expect(dayMatches.length).toBe(3);
    expect(html).toMatch(/14(?:<!-- -->)?°/);
    expect(html).toMatch(/6(?:<!-- -->)?°/);
  });

  it("shows relative update time for fresh data", () => {
    const html = renderToString(
      React.createElement(WeatherView, { data: sampleData }),
    );
    expect(html).toContain("分钟前更新");
    expect(html).not.toContain("缓存");
  });

  it("marks stale data in update line", () => {
    const stale: WeatherApiPayload = {
      ...sampleData,
      now: { ...sampleData.now, stale: true },
    };
    const html = renderToString(
      React.createElement(WeatherView, { data: stale }),
    );
    expect(html).toContain("缓存");
    expect(html).toContain('data-stale="true"');
  });

  it("shows friendly message when null / error", () => {
    const htmlNull = renderToString(
      React.createElement(WeatherView, { data: null }),
    );
    expect(htmlNull).toContain("天气暂不可用");
    expect(htmlNull).toContain('data-state="unavailable"');

    const htmlErr = renderToString(
      React.createElement(WeatherView, { data: null, error: true }),
    );
    expect(htmlErr).toContain("天气暂不可用");
  });

  it("shows loading state", () => {
    const html = renderToString(
      React.createElement(WeatherView, { data: null, loading: true }),
    );
    expect(html).toContain("加载中");
    expect(html).toContain('data-state="loading"');
  });
});
