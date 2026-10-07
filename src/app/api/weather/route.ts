import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_POSTAL_CODE, getWeatherByPostal } from "@/lib/weather";

export const dynamic = "force-dynamic";

/**
 * GET /api/weather?postalCode=J4L%203B3&days=3
 * Public (display board has no session). Thin wrapper over TASK-014 data layer.
 * Responses include `fetchedAt` (cache timestamp) and `now.stale`.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const postalRaw = sp.get("postalCode")?.trim() || DEFAULT_POSTAL_CODE;
  const daysRaw = Number(sp.get("days") ?? "3");
  const days = Number.isFinite(daysRaw) ? Math.min(7, Math.max(1, Math.round(daysRaw))) : 3;

  const hit = await getWeatherByPostal(postalRaw);
  if (!hit) {
    return NextResponse.json(
      { error: "weather_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { location, result: weather } = hit.data;
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
      fetchedAt: new Date(hit.fetchedAt).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
