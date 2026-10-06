import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_POSTAL_CODE,
  getWeather,
  resolveLocation,
} from "@/lib/weather";

export const dynamic = "force-dynamic";

/**
 * GET /api/weather?postalCode=J4L%203B3&days=3
 * Public (display board has no session). Thin wrapper over TASK-014 data layer.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const postalRaw = sp.get("postalCode")?.trim() || DEFAULT_POSTAL_CODE;
  const daysRaw = Number(sp.get("days") ?? "3");
  const days = Number.isFinite(daysRaw)
    ? Math.min(7, Math.max(1, Math.round(daysRaw)))
    : 3;

  let location = await resolveLocation(postalRaw);
  if (!location) {
    // Last resort: try default postal
    if (postalRaw !== DEFAULT_POSTAL_CODE) {
      location = await resolveLocation(DEFAULT_POSTAL_CODE);
    }
  }
  if (!location) {
    return NextResponse.json(
      { error: "location_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const weather = await getWeather(location.lat, location.lon);
  if (!weather) {
    return NextResponse.json(
      { error: "weather_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const forecast = weather.forecast.slice(0, days);

  return NextResponse.json(
    {
      location,
      now: {
        temperature: weather.now.temperature,
        feelsLike: weather.now.feelsLike,
        condition: weather.now.condition,
        icon: weather.now.icon,
        humidity: weather.now.humidity,
        windSpeed: weather.now.windSpeed,
        updatedAt: weather.now.updatedAt.toISOString(),
        stale: weather.now.stale,
      },
      forecast,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
