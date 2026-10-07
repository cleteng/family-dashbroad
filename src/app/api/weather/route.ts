import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_POSTAL_CODE,
  getWeatherByPostal,
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

  let hit = await getWeatherByPostal(postalRaw);
  if (!hit && postalRaw !== DEFAULT_POSTAL_CODE) {
    hit = await getWeatherByPostal(DEFAULT_POSTAL_CODE);
  }
  if (!hit) {
    return NextResponse.json(
      { error: "weather_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Resolve location name for response (best-effort; weather already cached by coords)
  let location = await resolveLocation(postalRaw);
  if (!location && postalRaw !== DEFAULT_POSTAL_CODE) {
    location = await resolveLocation(DEFAULT_POSTAL_CODE);
  }

  const forecast = hit.forecast.slice(0, days);

  return NextResponse.json(
    {
      location: location ?? { lat: 0, lon: 0, name: postalRaw },
      now: {
        temperature: hit.now.temperature,
        feelsLike: hit.now.feelsLike,
        condition: hit.now.condition,
        icon: hit.now.icon,
        humidity: hit.now.humidity,
        windSpeed: hit.now.windSpeed,
        updatedAt: hit.now.updatedAt.toISOString(),
        stale: hit.now.stale,
      },
      forecast,
      fetchedAt: new Date(hit.fetchedAt).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
