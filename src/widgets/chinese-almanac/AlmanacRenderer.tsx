"use client";

import { useMemo, useState } from "react";
import { getCalendarDay } from "@/lib/calendar";
import { almanacDateColorClass, mergeChineseAlmanacConfig } from "./config";

function shiftDate(
  y: number,
  m: number,
  d: number,
  delta: number,
): { year: number; month: number; day: number } {
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return {
    year: dt.getFullYear(),
    month: dt.getMonth() + 1,
    day: dt.getDate(),
  };
}

export function AlmanacRenderer({ config }: { config: Record<string, unknown> }) {
  const cfg = mergeChineseAlmanacConfig(config);
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  });

  const info = useMemo(
    () => getCalendarDay(cursor.year, cursor.month, cursor.day),
    [cursor.year, cursor.month, cursor.day],
  );

  const dateColor = almanacDateColorClass(info.chinaHoliday);
  const banner = info.chinaHoliday || info.solarTerm;

  return (
    <div
      className="flex h-full min-h-[220px] flex-col items-center justify-center bg-[#f7f0e4] px-3 py-4 text-center"
      data-testid="chinese-almanac-widget"
      data-widget-type="chinese-almanac"
    >
      {/* 禁止出现「福到万家」等营销横幅 */}
      <div className="text-sm font-medium tracking-wide text-zinc-700">
        {info.gregorian.year}年{info.gregorian.month}月
      </div>

      <div
        className={`my-1 text-6xl font-bold leading-none tabular-nums md:text-7xl ${dateColor}`}
        data-testid="almanac-day-number"
      >
        {info.gregorian.day}
      </div>

      <div className="mt-1 text-base text-zinc-800" data-testid="almanac-weekday">
        星期{info.weekday}
      </div>

      <div className="mt-3 space-y-0.5 text-sm text-zinc-700" data-testid="almanac-lunar">
        <div>
          农历{info.lunar.monthName}
          {info.lunar.dayName}
        </div>
        <div className="text-xs text-zinc-500">
          {info.lunar.ganzhi}年 · {info.lunar.zodiac}
        </div>
      </div>

      {banner ? (
        <div
          className={`mt-3 w-full max-w-xs rounded px-3 py-1.5 text-sm font-semibold ${
            info.chinaHoliday ? "bg-red-600 text-white" : "bg-green-700 text-white"
          }`}
          data-testid="almanac-banner"
        >
          {banner}
        </div>
      ) : null}

      {cfg.showNavigation ? (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="rounded border border-zinc-400 px-3 py-1 text-sm text-zinc-700 hover:bg-white/60"
            data-testid="almanac-prev"
            onClick={() => setCursor((c) => shiftDate(c.year, c.month, c.day, -1))}
          >
            前一天
          </button>
          <button
            type="button"
            className="rounded border border-zinc-400 px-3 py-1 text-sm text-zinc-700 hover:bg-white/60"
            data-testid="almanac-next"
            onClick={() => setCursor((c) => shiftDate(c.year, c.month, c.day, 1))}
          >
            后一天
          </button>
        </div>
      ) : null}
    </div>
  );
}
