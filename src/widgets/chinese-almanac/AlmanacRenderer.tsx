"use client";

import { useMemo, useState } from "react";
import { getCalendarDay } from "@/lib/calendar";
import {
  almanacDateColorClass,
  mergeChineseAlmanacConfig,
} from "./config";

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

export function AlmanacRenderer({
  config,
}: {
  config: Record<string, unknown>;
}) {
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
  const yiShow = info.yi.slice(0, 6);
  const jiShow = info.ji.slice(0, 6);

  return (
    <div
      className="flex h-full min-h-[320px] flex-col overflow-auto rounded-sm bg-[#faf6ee] text-[#c41e3a] shadow-md"
      data-testid="chinese-almanac-widget"
      data-widget-type="chinese-almanac"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(180,60,40,0.04) 1px, transparent 0)",
        backgroundSize: "12px 12px",
      }}
    >
      <div
        className="relative flex h-7 shrink-0 items-center justify-center bg-gradient-to-b from-[#e03131] to-[#c41e3a]"
        aria-hidden
      >
        <div className="absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-[#d4a017] bg-[#b8860b]" />
        <div className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-[#d4a017] bg-[#b8860b]" />
      </div>

      <div className="mt-1.5 flex items-center justify-between px-2 text-[12px] font-semibold tracking-wider">
        <span className="tabular-nums">{info.gregorian.year}</span>
        <span className="rounded-full border border-[#c41e3a]/40 px-2 py-0.5">
          {MONTH_CN[info.gregorian.month]}
        </span>
        <span className="text-[11px]">农历{info.lunar.monthName}</span>
      </div>

      <div className="relative mt-0.5 flex items-center px-1">
        <div className="w-12 shrink-0 text-left text-[9px] leading-tight text-[#c41e3a]/90">
          <div>第 {doy} 天</div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <div
            className={`text-[64px] font-black leading-none tabular-nums md:text-[76px] ${dateColor}`}
            data-testid="almanac-day-number"
            style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}
          >
            {info.gregorian.day}
          </div>
        </div>
        <div
          className="w-14 shrink-0 text-right text-[10px] leading-snug"
          data-testid="almanac-weekday"
        >
          <div className="font-semibold">星期{info.weekday}</div>
          <div className="text-[9px] text-[#c41e3a]/80">{enWeek}</div>
          <div className="mt-0.5 text-[9px]" data-testid="almanac-lunar">
            {info.lunar.ganzhi}年
            <br />
            {info.lunar.zodiac}年
          </div>
        </div>
      </div>

      <div className="text-center text-xs font-medium text-[#8b1a1a]">
        {info.lunar.monthName}
        {info.lunar.dayName}
      </div>

      {info.chinaHoliday || info.solarTerm ? (
        <div
          className="mx-2 mt-1 flex items-center justify-center gap-1 border-y border-[#2d6a4f]/30 py-1"
          data-testid="almanac-banner"
        >
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
              info.chinaHoliday
                ? "border-[#c41e3a] bg-[#c41e3a] text-white"
                : "border-[#2d6a4f] text-[#2d6a4f]"
            }`}
          >
            {info.chinaHoliday ?? info.solarTerm}
          </span>
        </div>
      ) : null}

      {/* 宜 / 吉时 / 忌 */}
      <div
        className="mx-2 mt-1.5 grid grid-cols-[1fr_1.2fr_1fr] gap-1 text-[10px]"
        data-testid="almanac-yiji"
      >
        <div className="rounded border border-[#c41e3a]/50 p-1">
          <div className="mb-0.5 text-center text-[11px] font-bold">宜</div>
          <div className="grid grid-cols-2 gap-x-0.5 text-center text-[#2d6a4f]">
            {yiShow.length === 0 ? (
              <span className="col-span-2 text-[#c41e3a]/50">—</span>
            ) : (
              yiShow.map((x) => <span key={x}>{x}</span>)
            )}
          </div>
        </div>

        <div className="rounded border border-[#c41e3a]/40 p-1">
          <div className="mb-0.5 text-center text-[11px] font-bold text-[#2d6a4f]">
            今日吉时
          </div>
          <div
            className="grid grid-cols-4 gap-0.5 text-center"
            data-testid="almanac-times"
          >
            {info.times.map((t) => (
              <div key={t.zhi} className="leading-tight">
                <div className="text-[#2d6a4f]">{t.zhi}</div>
                <div
                  className={
                    t.luck === "吉" ? "text-[#c41e3a]" : "text-zinc-400"
                  }
                >
                  {t.luck === "吉" ? "●" : "○"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-[#c41e3a]/50 p-1">
          <div className="mb-0.5 text-center text-[11px] font-bold">忌</div>
          <div className="grid grid-cols-2 gap-x-0.5 text-center text-[#c41e3a]">
            {jiShow.length === 0 ? (
              <span className="col-span-2 text-[#c41e3a]/50">—</span>
            ) : (
              jiShow.map((x) => <span key={x}>{x}</span>)
            )}
          </div>
        </div>
      </div>

      {/* 五行 / 冲煞 / 值神 / 八字 */}
      <div
        className="mx-2 mt-1 mb-1 grid grid-cols-2 gap-1 border border-[#c41e3a]/30 p-1 text-[9px] leading-snug"
        data-testid="almanac-meta"
      >
        <div>
          <span className="font-semibold">五行</span>{" "}
          <span className="text-[#2d6a4f]">{info.naYin || "—"}</span>
        </div>
        <div>
          <span className="font-semibold">值神</span> {info.tianShen || "—"}
        </div>
        <div>
          <span className="font-semibold">冲</span> {info.chong || "—"}
        </div>
        <div>
          <span className="font-semibold">煞</span> {info.sha || "—"}
        </div>
        {info.eightChar ? (
          <div className="col-span-2 border-t border-[#c41e3a]/20 pt-0.5">
            <span className="font-semibold">今日八字</span> {info.eightChar}
          </div>
        ) : null}
        {yiShow[0] ? (
          <div className="col-span-2 text-[#2d6a4f]">
            <span className="font-semibold text-[#c41e3a]">本日宜</span>{" "}
            {yiShow.slice(0, 3).join(" ")}
          </div>
        ) : null}
      </div>

      {cfg.showNavigation ? (
        <div className="mt-auto flex justify-center gap-3 border-t border-[#c41e3a]/15 py-1.5">
          <button
            type="button"
            className="rounded border border-[#c41e3a]/50 px-2.5 py-0.5 text-[10px] text-[#c41e3a] hover:bg-[#c41e3a]/10"
            data-testid="almanac-prev"
            onClick={() =>
              setCursor((c) => shiftDate(c.year, c.month, c.day, -1))
            }
          >
            前一天
          </button>
          <button
            type="button"
            className="rounded border border-[#c41e3a]/50 px-2.5 py-0.5 text-[10px] text-[#c41e3a] hover:bg-[#c41e3a]/10"
            data-testid="almanac-next"
            onClick={() =>
              setCursor((c) => shiftDate(c.year, c.month, c.day, 1))
            }
          >
            后一天
          </button>
        </div>
      ) : null}
    </div>
  );
}
