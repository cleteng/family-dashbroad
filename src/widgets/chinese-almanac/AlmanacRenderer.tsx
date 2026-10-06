"use client";

import { useMemo, useState } from "react";
import { getCalendarDay } from "@/lib/calendar";
import { almanacDateColorClass, mergeChineseAlmanacConfig } from "./config";

const WEEKDAY_EN: Record<string, string> = {
  日: "Sunday",
  一: "Monday",
  二: "Tuesday",
  三: "Wednesday",
  四: "Thursday",
  五: "Friday",
  六: "Saturday",
};

const MONTH_CN = [
  "",
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

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

function dayOfYear(y: number, m: number, d: number): number {
  const start = new Date(y, 0, 0);
  const now = new Date(y, m - 1, d);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
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
  const doy = dayOfYear(cursor.year, cursor.month, cursor.day);
  const enWeek = WEEKDAY_EN[info.weekday] ?? "";

  return (
    <div
      className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-sm bg-[#faf6ee] text-[#c41e3a] shadow-md"
      data-testid="chinese-almanac-widget"
      data-widget-type="chinese-almanac"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(180,60,40,0.04) 1px, transparent 0)",
        backgroundSize: "12px 12px",
      }}
    >
      {/* 顶部挂历红条 — 无「福到万家」 */}
      <div
        className="relative flex h-8 shrink-0 items-center justify-center bg-gradient-to-b from-[#e03131] to-[#c41e3a]"
        aria-hidden
      >
        <div className="absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#d4a017] bg-[#b8860b]" />
        <div className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#d4a017] bg-[#b8860b]" />
        <div className="h-px w-2/3 bg-[#ffd7a8]/opacity-40" />
      </div>

      {/* 年 / 公历月 / 农历月 */}
      <div className="mt-2 flex items-center justify-between px-3 text-[13px] font-semibold tracking-wider">
        <span className="tabular-nums">{info.gregorian.year}</span>
        <span className="rounded-full border border-[#c41e3a]/40 px-2 py-0.5">
          {MONTH_CN[info.gregorian.month]}
        </span>
        <span className="text-[12px]">农历{info.lunar.monthName}</span>
      </div>

      {/* 中部：左元日 / 大号日期 / 右星期与干支 */}
      <div className="relative mt-1 flex flex-1 items-center px-2">
        <div className="w-14 shrink-0 text-left text-[10px] leading-tight text-[#c41e3a]/90">
          <div>第 {doy} 天</div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center">
          <div
            className={`text-[72px] font-black leading-none tabular-nums md:text-[88px] ${dateColor}`}
            data-testid="almanac-day-number"
            style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}
          >
            {info.gregorian.day}
          </div>
        </div>

        <div
          className="w-16 shrink-0 text-right text-[11px] leading-snug"
          data-testid="almanac-weekday"
        >
          <div className="font-semibold">星期{info.weekday}</div>
          <div className="text-[10px] text-[#c41e3a]/80">{enWeek}</div>
          <div className="mt-1 text-[10px]" data-testid="almanac-lunar">
            {info.lunar.ganzhi}年
            <br />
            {info.lunar.zodiac}年
          </div>
        </div>
      </div>

      {/* 农历日行 */}
      <div className="text-center text-sm font-medium text-[#8b1a1a]">
        {info.lunar.monthName}
        {info.lunar.dayName}
      </div>

      {/* 节气 / 节假日 — 仿参考图绿色山水条风格 */}
      {info.chinaHoliday || info.solarTerm ? (
        <div
          className="mx-3 mt-2 flex items-center justify-center gap-2 border-y border-[#2d6a4f]/30 py-1.5"
          data-testid="almanac-banner"
        >
          <span className="text-[10px] text-[#2d6a4f]">〰</span>
          <span
            className={`rounded-full border px-3 py-0.5 text-sm font-bold ${
              info.chinaHoliday
                ? "border-[#c41e3a] bg-[#c41e3a] text-white"
                : "border-[#2d6a4f] text-[#2d6a4f]"
            }`}
          >
            {info.chinaHoliday ?? info.solarTerm}
          </span>
          <span className="text-[10px] text-[#2d6a4f]">〰</span>
        </div>
      ) : (
        <div className="mx-3 mt-2 border-t border-[#c41e3a]/20" />
      )}

      {cfg.showNavigation ? (
        <div className="mt-auto flex justify-center gap-3 border-t border-[#c41e3a]/15 py-2">
          <button
            type="button"
            className="rounded border border-[#c41e3a]/50 px-3 py-0.5 text-xs text-[#c41e3a] hover:bg-[#c41e3a]/10"
            data-testid="almanac-prev"
            onClick={() => setCursor((c) => shiftDate(c.year, c.month, c.day, -1))}
          >
            前一天
          </button>
          <button
            type="button"
            className="rounded border border-[#c41e3a]/50 px-3 py-0.5 text-xs text-[#c41e3a] hover:bg-[#c41e3a]/10"
            data-testid="almanac-next"
            onClick={() => setCursor((c) => shiftDate(c.year, c.month, c.day, 1))}
          >
            后一天
          </button>
        </div>
      ) : (
        <div className="h-2" />
      )}
    </div>
  );
}
