"use client";

import { useMemo, useState } from "react";
import { getMonthCalendar, type CalendarDay } from "@/lib/calendar";
import { mergeCalendarConfig } from "./config";

function isSameDay(
  a: { year: number; month: number; day: number },
  y: number,
  m: number,
  d: number,
): boolean {
  return a.year === y && a.month === m && a.day === d;
}

function cellLabel(day: CalendarDay, showLunar: boolean): string {
  if (day.solarTerm) return day.solarTerm;
  if (day.chinaHoliday) return day.chinaHoliday;
  if (!showLunar) return "";
  if (day.lunar.day === 1) return day.lunar.monthName;
  return day.lunar.dayName;
}

export function CalendarRenderer({ config }: { config: Record<string, unknown> }) {
  const cfg = mergeCalendarConfig(config);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState<{
    year: number;
    month: number;
    day: number;
  } | null>(null);

  const grid = useMemo(() => getMonthCalendar(viewYear, viewMonth), [viewYear, viewMonth]);

  const headers =
    cfg.weekStart === "sunday"
      ? ["日", "一", "二", "三", "四", "五", "六"]
      : ["一", "二", "三", "四", "五", "六", "日"];

  // getMonthCalendar is Monday-first; rotate if weekStart=sunday
  const rows = useMemo(() => {
    if (cfg.weekStart === "monday") return grid;
    return grid.map((week) => {
      // Monday-first → Sunday-first: move last to front...
      // Actually Mon-first week is [Mon..Sun]. Sunday-first wants [Sun..Sat].
      // Take previous week's Sunday as start: shift right by 1 within continuous month grid is wrong.
      // Simpler: rebuild from Monday grid by rotating each week: [Sun]=week[6], [Mon]=week[0]...
      return [week[6], week[0], week[1], week[2], week[3], week[4], week[5]];
    });
  }, [grid, cfg.weekStart]);

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const today = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };

  return (
    <div
      className="flex h-full min-h-[200px] flex-col bg-zinc-950 p-2 text-zinc-100"
      data-testid="calendar-widget"
      data-widget-type="calendar"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
          onClick={prevMonth}
          data-testid="calendar-prev"
          aria-label="上月"
        >
          ‹
        </button>
        <div className="text-sm font-medium" data-testid="calendar-title">
          {viewYear} 年 {viewMonth} 月
        </div>
        <button
          type="button"
          className="rounded px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
          onClick={nextMonth}
          data-testid="calendar-next"
          aria-label="下月"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-zinc-500">
        {headers.map((h) => (
          <div key={h} className="py-0.5">
            {h}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 gap-0.5">
        {rows.flat().map((day, idx) => {
          const inMonth = day.gregorian.month === viewMonth;
          const isToday = isSameDay(day.gregorian, today.year, today.month, today.day);
          const isSelected =
            selected && isSameDay(day.gregorian, selected.year, selected.month, selected.day);
          const label = cellLabel(day, cfg.showLunar);
          const isChinaHoliday = Boolean(day.chinaHoliday);
          const isCanadaHoliday =
            cfg.showCanadaHolidays && Boolean(day.canadaHoliday) && !isChinaHoliday;

          return (
            <button
              key={`${day.gregorian.year}-${day.gregorian.month}-${day.gregorian.day}-${idx}`}
              type="button"
              data-testid={`calendar-cell-${day.gregorian.year}-${day.gregorian.month}-${day.gregorian.day}`}
              data-today={isToday ? "1" : undefined}
              className={[
                "flex flex-col items-center justify-start rounded px-0.5 py-0.5 text-xs",
                inMonth ? "text-zinc-100" : "text-zinc-600",
                isToday ? "bg-sky-700/80 ring-1 ring-sky-400" : "",
                isSelected && !isToday ? "bg-zinc-700 ring-1 ring-zinc-400" : "",
                !isToday && !isSelected ? "hover:bg-zinc-800" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                setSelected({
                  year: day.gregorian.year,
                  month: day.gregorian.month,
                  day: day.gregorian.day,
                })
              }
            >
              <span className={isChinaHoliday && inMonth ? "font-semibold text-red-400" : ""}>
                {day.gregorian.day}
              </span>
              <span
                className={[
                  "max-w-full truncate text-[9px] leading-tight",
                  isChinaHoliday && inMonth
                    ? "text-red-400"
                    : isCanadaHoliday && inMonth
                      ? "text-green-400"
                      : "text-zinc-500",
                ].join(" ")}
              >
                {label || (isCanadaHoliday && day.canadaHoliday ? day.canadaHoliday : "\u00A0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
