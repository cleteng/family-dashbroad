/**
 * Weather data layer (TASK-014) + TASK-022 cache.
 * Open-Meteo only — no API key.
 * Cached server-side as `weather:{postalCode}` (see `@/lib/cache`).
 */

import { type CacheHit, getCached, weatherCacheKey, weatherTtlMs } from "@/lib/cache";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

/** Default location: Longueuil, QC (postal J4L 3B3). Overridable via env. */
export const DEFAULT_POSTAL_CODE = process.env.WEATHER_DEFAULT_POSTAL?.trim() || "J4L 3B3";

/** Known coords for default postal when geocoding returns empty (Open-Meteo postal support is limited). */
const DEFAULT_LOCATION = {
  lat: 45.5316,
  lon: -73.5181,
  name: "Longueuil",
} as const;

export interface WeatherNow {
  temperature: number;
  feelsLike: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  updatedAt: Date;
  stale: boolean;
}

export interface WeatherForecastDay {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
}

export interface WeatherResult {
  now: WeatherNow;
  forecast: WeatherForecastDay[];
}

export interface ResolvedLocation {
  lat: number;
  lon: number;
  name: string;
}

export type WeatherBundle = {
  location: ResolvedLocation;
  result: WeatherResult;
};

/** Normalize Canadian postal: strip spaces, uppercase. */
export function normalizePostalCode(postalCode: string): string {
  return postalCode.replace(/\s+/g, "").toUpperCase();
}

/** WMO weather interpretation codes → condition + icon name for TASK-015. */
export function mapWeatherCode(code: number): {
  condition: string;
  icon: string;
} {
  // https://open-meteo.com/en/docs — WMO Weather interpretation codes (WW)
  if (code === 0) return { condition: "Clear", icon: "clear" };
  if (code === 1) return { condition: "Mainly Clear", icon: "mainly-clear" };
  if (code === 2) return { condition: "Partly Cloudy", icon: "partly-cloudy" };
  if (code === 3) return { condition: "Cloudy", icon: "cloudy" };
  if (code === 45 || code === 48) return { condition: "Fog", icon: "fog" };
  if (code >= 51 && code <= 57) return { condition: "Drizzle", icon: "drizzle" };
  if (code >= 61 && code <= 67) return { condition: "Rain", icon: "rain" };
  if (code >= 71 && code <= 77) return { condition: "Snow", icon: "snow" };
  if (code >= 80 && code <= 82) return { condition: "Rain Showers", icon: "showers" };
  if (code === 85 || code === 86) return { condition: "Snow Showers", icon: "snow-showers" };
  if (code >= 95 && code <= 99) return { condition: "Thunderstorm", icon: "thunderstorm" };
  return { condition: "Unknown", icon: "unknown" };
}

type FetchLike = typeof fetch;

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  fetchImpl: FetchLike,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string, fetchImpl: FetchLike = fetch): Promise<Response | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS, fetchImpl);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  void lastError;
  return null;
}

interface GeocodeApiResult {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country_code?: string;
    admin1?: string;
  }>;
}

/**
 * Resolve a Canadian postal code (or place name) to lat/lon + display name.
 * Uses Open-Meteo Geocoding API. Returns null on failure.
 * For the default postal J4L 3B3, falls back to known Longueuil coords if API has no hit.
 */
export async function resolveLocation(
  postalCode: string,
  fetchImpl: FetchLike = fetch,
): Promise<ResolvedLocation | null> {
  const raw = postalCode.trim();
  if (!raw) return null;

  const normalized = normalizePostalCode(raw);
  const isDefault = normalized === normalizePostalCode(DEFAULT_POSTAL_CODE);

  // Try full postal, then with country qualifier, then first 3 chars (FSA)
  const queries = [`${raw}, Canada`, normalized, `${normalized.slice(0, 3)}, Canada`];

  for (const q of queries) {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=5&language=en&format=json&countryCode=CA`;
    const res = await fetchWithRetry(url, fetchImpl);
    if (!res) continue;

    let body: GeocodeApiResult;
    try {
      body = (await res.json()) as GeocodeApiResult;
    } catch {
      continue;
    }

    const hit = body.results?.[0];
    if (hit && typeof hit.latitude === "number" && typeof hit.longitude === "number") {
      const nameParts = [hit.name, hit.admin1].filter(Boolean);
      return {
        lat: hit.latitude,
        lon: hit.longitude,
        name: nameParts.join(", ") || hit.name,
      };
    }
  }

  if (isDefault) {
    return { ...DEFAULT_LOCATION };
  }

  return null;
}

interface ForecastApiResponse {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

function parseForecast(body: ForecastApiResponse, stale: boolean): WeatherResult | null {
  const cur = body.current;
  const daily = body.daily;
  if (!cur || !daily?.time?.length) return null;

  const mapped = mapWeatherCode(cur.weather_code ?? 0);
  const now: WeatherNow = {
    temperature: cur.temperature_2m,
    feelsLike: cur.apparent_temperature,
    condition: mapped.condition,
    icon: mapped.icon,
    humidity: cur.relative_humidity_2m,
    windSpeed: cur.wind_speed_10m,
    updatedAt: new Date(cur.time),
    stale,
  };

  const forecast: WeatherForecastDay[] = daily.time.map((date, i) => {
    const code = daily.weather_code[i] ?? 0;
    const m = mapWeatherCode(code);
    return {
      date,
      high: daily.temperature_2m_max[i] ?? 0,
      low: daily.temperature_2m_min[i] ?? 0,
      condition: m.condition,
      icon: m.icon,
    };
  });

  return { now, forecast };
}

/**
 * Fetch current + daily forecast for coordinates (uncached).
 * Returns null on API failure. Prefer `getWeatherByPostal` at the API boundary
 * so results live under `weather:{postalCode}`.
 */
export async function getWeather(
  lat: number,
  lon: number,
  fetchImpl: FetchLike = fetch,
): Promise<WeatherResult | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
    daily: ["weather_code", "temperature_2m_max", "temperature_2m_min"].join(","),
    timezone: "auto",
    forecast_days: "7",
    wind_speed_unit: "kmh",
  });

  const url = `${FORECAST_URL}?${params.toString()}`;
  const res = await fetchWithRetry(url, fetchImpl);

  if (res) {
    try {
      const body = (await res.json()) as ForecastApiResponse;
      const parsed = parseForecast(body, false);
      if (parsed) return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

async function loadWeatherBundle(postalCode: string, fetchImpl: FetchLike): Promise<WeatherBundle> {
  const raw = postalCode.trim() || DEFAULT_POSTAL_CODE;
  let location = await resolveLocation(raw, fetchImpl);
  if (!location && raw !== DEFAULT_POSTAL_CODE) {
    location = await resolveLocation(DEFAULT_POSTAL_CODE, fetchImpl);
  }
  if (!location) {
    throw new Error("location_unavailable");
  }
  const result = await getWeather(location.lat, location.lon, fetchImpl);
  if (!result) {
    throw new Error("weather_unavailable");
  }
  return { location, result };
}

/**
 * Cached weather for a postal code (`weather:{postalCode}`, TTL 15 min).
 * On API failure: returns stale cache when present, otherwise null.
 */
export async function getWeatherByPostal(
  postalCode: string,
  fetchImpl: FetchLike = fetch,
): Promise<CacheHit<WeatherBundle> | null> {
  const raw = postalCode.trim() || DEFAULT_POSTAL_CODE;
  try {
    const hit = await getCached(
      weatherCacheKey(raw),
      () => loadWeatherBundle(raw, fetchImpl),
      weatherTtlMs(),
    );
    return {
      data: {
        location: hit.data.location,
        result: {
          now: { ...hit.data.result.now, stale: hit.stale },
          forecast: hit.data.result.forecast,
        },
      },
      fetchedAt: hit.fetchedAt,
      stale: hit.stale,
    };
  } catch {
    return null;
  }
}
