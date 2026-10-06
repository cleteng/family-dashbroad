import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resolveLocation,
  getWeather,
  clearWeatherCache,
  seedWeatherCache,
  normalizePostalCode,
  mapWeatherCode,
  DEFAULT_POSTAL_CODE,
  type WeatherResult,
} from "@/lib/weather";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sampleWeather: WeatherResult = {
  now: {
    temperature: 12,
    feelsLike: 10,
    condition: "Cloudy",
    icon: "cloudy",
    humidity: 70,
    windSpeed: 15,
    updatedAt: new Date("2026-10-06T12:00:00Z"),
    stale: false,
  },
  forecast: [
    {
      date: "2026-10-06",
      high: 14,
      low: 8,
      condition: "Cloudy",
      icon: "cloudy",
    },
  ],
};

describe("normalizePostalCode", () => {
  it("strips spaces and uppercases", () => {
    expect(normalizePostalCode("j4l 3b3")).toBe("J4L3B3");
    expect(normalizePostalCode("  J4L3B3  ")).toBe("J4L3B3");
  });
});

describe("mapWeatherCode", () => {
  it("maps clear / rain / snow / storm", () => {
    expect(mapWeatherCode(0)).toEqual({ condition: "Clear", icon: "clear" });
    expect(mapWeatherCode(61)).toEqual({ condition: "Rain", icon: "rain" });
    expect(mapWeatherCode(71)).toEqual({ condition: "Snow", icon: "snow" });
    expect(mapWeatherCode(95)).toEqual({
      condition: "Thunderstorm",
      icon: "thunderstorm",
    });
  });
});

describe("resolveLocation", () => {
  beforeEach(() => {
    clearWeatherCache();
  });

  it("returns null for empty input", async () => {
    const fetchMock = vi.fn();
    expect(await resolveLocation("", fetchMock)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns location from geocoding API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            name: "Longueuil",
            latitude: 45.5316,
            longitude: -73.5181,
            admin1: "Quebec",
            country_code: "CA",
          },
        ],
      }),
    );

    const loc = await resolveLocation("J4L 3B3", fetchMock);
    expect(loc).toEqual({
      lat: 45.5316,
      lon: -73.5181,
      name: "Longueuil, Quebec",
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("returns null when geocoding fails and not default postal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    const loc = await resolveLocation("Z9Z 9Z9", fetchMock);
    expect(loc).toBeNull();
  });

  it("falls back to known coords for default postal when API empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    const loc = await resolveLocation(DEFAULT_POSTAL_CODE, fetchMock);
    expect(loc).not.toBeNull();
    expect(loc!.name).toBe("Longueuil");
    expect(loc!.lat).toBeCloseTo(45.53, 1);
  });

  it("returns null when network fails and not default", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    const loc = await resolveLocation("H2X 1Y4", fetchMock);
    expect(loc).toBeNull();
  });
});

describe("getWeather — cache & degrade", () => {
  beforeEach(() => {
    clearWeatherCache();
  });

  const forecastBody = {
    current: {
      time: "2026-10-06T12:00",
      temperature_2m: 12.5,
      relative_humidity_2m: 65,
      apparent_temperature: 11.0,
      weather_code: 3,
      wind_speed_10m: 18.2,
    },
    daily: {
      time: ["2026-10-06", "2026-10-07"],
      weather_code: [3, 61],
      temperature_2m_max: [15, 13],
      temperature_2m_min: [8, 7],
    },
  };

  it("fetches and caches weather", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(forecastBody));
    const result = await getWeather(45.53, -73.52, fetchMock);
    expect(result).not.toBeNull();
    expect(result!.now.temperature).toBe(12.5);
    expect(result!.now.condition).toBe("Cloudy");
    expect(result!.now.stale).toBe(false);
    expect(result!.forecast).toHaveLength(2);
    expect(result!.forecast[1].condition).toBe("Rain");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call within TTL → cache hit, no extra fetch
    const again = await getWeather(45.53, -73.52, fetchMock);
    expect(again!.now.temperature).toBe(12.5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns stale cache when API fails", async () => {
    seedWeatherCache(45.53, -73.52, sampleWeather, Date.now() - 20 * 60 * 1000);
    const fetchMock = vi.fn().mockRejectedValue(new Error("down"));
    const result = await getWeather(45.53, -73.52, fetchMock);
    expect(result).not.toBeNull();
    expect(result!.now.stale).toBe(true);
    expect(result!.now.temperature).toBe(12);
  });

  it("returns null when no cache and API fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("down"));
    const result = await getWeather(1, 2, fetchMock);
    expect(result).toBeNull();
  });

  it("returns null when API returns empty body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    const result = await getWeather(1, 2, fetchMock);
    expect(result).toBeNull();
  });

  it("retries once on failure then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("temp"))
      .mockResolvedValueOnce(jsonResponse(forecastBody));
    const result = await getWeather(45.1, -73.1, fetchMock);
    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
