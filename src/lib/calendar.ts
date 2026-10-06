/**
 * Pure calendar calculation engine (no DB / API / UI).
 * Used by future calendar widgets (TASK-012 / TASK-013).
 */
import { Solar } from "lunar-javascript";

export interface AlmanacTimeSlot {
  /** 地支：子丑寅… */
  zhi: string;
  /** 黄道吉凶 */
  luck: "吉" | "凶";
  ganZhi: string;
}

export interface CalendarDay {
  gregorian: { year: number; month: number; day: number };
  /** 周一~周日 → "一" … "日" */
  weekday: string;
  lunar: {
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
    zodiac: string;
    ganzhi: string;
    monthName: string;
    dayName: string;
  };
  solarTerm: string | null;
  chinaHoliday: string | null;
  canadaHoliday: string | null;
  /** 宜 */
  yi: string[];
  /** 忌 */
  ji: string[];
  /** 纳音五行，如「大驿土」 */
  naYin: string;
  /** 冲煞简述 */
  chong: string;
  sha: string;
  /** 值神 */
  tianShen: string;
  /** 十二时辰吉凶（去重地支，保留白天常用 12 个） */
  times: AlmanacTimeSlot[];
  /** 四柱八字 年 月 日 时 */
  eightChar: string;
}

const WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"] as const;

/** nth weekday in month (weekday: 0=Sun … 6=Sat). */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === weekday) {
      count += 1;
      if (count === n) return d;
    }
  }
  return 0;
}

/**
 * Easter Sunday (Anonymous Gregorian algorithm).
 * Returns { month, day } (1-based month).
 */
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Canada (Quebec-oriented federal + provincial common holidays).
 * Family Day: 3rd Monday of February (QC does not observe federally the same
 * everywhere; we include it as common "Family Day" when applicable — Ontario etc.
 * Spec lists Family Day; we compute 3rd Monday of Feb).
 */
function canadaHolidayName(year: number, month: number, day: number): string | null {
  // Fixed
  if (month === 1 && day === 1) return "New Year's Day";
  if (month === 6 && day === 24) return "St-Jean-Baptiste Day";
  if (month === 7 && day === 1) return "Canada Day";
  if (month === 12 && day === 25) return "Christmas Day";
  if (month === 12 && day === 26) return "Boxing Day";

  // Family Day — 3rd Monday of February
  if (month === 2 && day === nthWeekdayOfMonth(year, 2, 1, 3)) {
    return "Family Day";
  }

  // Victoria Day — Monday preceding May 25
  if (month === 5) {
    const may25 = new Date(year, 4, 25);
    const dow = may25.getDay();
    // Monday before May 25: if May 25 is Monday, go back 7; else go back to previous Monday
    const offset = dow === 1 ? 7 : (dow + 6) % 7;
    const victoria = 25 - offset;
    if (day === victoria) return "Victoria Day";
  }

  // Labour Day — 1st Monday of September
  if (month === 9 && day === nthWeekdayOfMonth(year, 9, 1, 1)) {
    return "Labour Day";
  }

  // Thanksgiving (Canada) — 2nd Monday of October
  if (month === 10 && day === nthWeekdayOfMonth(year, 10, 1, 2)) {
    return "Thanksgiving";
  }

  // Good Friday — 2 days before Easter
  const easter = easterSunday(year);
  const easterDate = new Date(year, easter.month - 1, easter.day);
  const goodFriday = new Date(easterDate);
  goodFriday.setDate(easterDate.getDate() - 2);
  if (
    goodFriday.getFullYear() === year &&
    goodFriday.getMonth() + 1 === month &&
    goodFriday.getDate() === day
  ) {
    return "Good Friday";
  }

  return null;
}

/** Fixed Gregorian China public holidays (non-lunar). */
function chinaFixedHoliday(year: number, month: number, day: number): string | null {
  if (month === 1 && day === 1) return "元旦";
  if (month === 5 && day === 1) return "劳动节";
  if (month === 10 && day === 1) return "国庆节";
  // 清明 is solar term based; handled separately when solar term is 清明
  return null;
}

/**
 * Lunar-based China holidays via Solar/Lunar.
 * Spring Festival: lunar 正月初一; Eve: day before.
 * Dragon Boat: lunar 五月初五; Mid-Autumn: lunar 八月十五.
 */
function chinaLunarHoliday(
  lunarMonth: number,
  lunarDay: number,
  isLeapMonth: boolean,
  isChunJieEve: boolean,
): string | null {
  if (isChunJieEve) return "除夕";
  if (isLeapMonth) return null;
  if (lunarMonth === 1 && lunarDay === 1) return "春节";
  if (lunarMonth === 5 && lunarDay === 5) return "端午节";
  if (lunarMonth === 8 && lunarDay === 15) return "中秋节";
  return null;
}

export function getCalendarDay(year: number, month: number, day: number): CalendarDay {
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  const weekdayIdx = solar.getWeek(); // 0=Sun … 6=Sat in lunar-javascript
  const weekday = WEEKDAY_CN[weekdayIdx] ?? "日";

  const lunarMonth = lunar.getMonth(); // negative if leap
  const isLeapMonth = lunarMonth < 0;
  const absMonth = Math.abs(lunarMonth);
  const lunarDay = lunar.getDay();

  // 节气：当日交节名（非节气日返回空串）
  let solarTerm: string | null = null;
  try {
    const jq = String(lunar.getJieQi() ?? "").trim();
    solarTerm = jq.length > 0 ? jq : null;
  } catch {
    solarTerm = null;
  }

  // 除夕 = 下一天是春节（正月初一）
  let isChunJieEve = false;
  try {
    const next = solar.next(1);
    const nextLunar = next.getLunar();
    if (
      Math.abs(nextLunar.getMonth()) === 1 &&
      nextLunar.getDay() === 1 &&
      nextLunar.getMonth() > 0
    ) {
      isChunJieEve = true;
    }
  } catch {
    isChunJieEve = false;
  }

  let chinaHoliday =
    chinaFixedHoliday(year, month, day) ??
    chinaLunarHoliday(absMonth, lunarDay, isLeapMonth, isChunJieEve);

  // 清明：节气名为清明时标为中国假日
  if (!chinaHoliday && solarTerm === "清明") {
    chinaHoliday = "清明节";
  }

  let monthNameFinal = String(lunar.getMonthInChinese());
  if (isLeapMonth && !monthNameFinal.startsWith("闰")) {
    monthNameFinal = `闰${monthNameFinal}`;
  }
  if (!monthNameFinal.includes("月")) {
    monthNameFinal = `${monthNameFinal}月`;
  }

  // 宜忌 / 五行 / 冲煞 / 时辰
  let yi: string[] = [];
  let ji: string[] = [];
  let naYin = "";
  let chong = "";
  let sha = "";
  let tianShen = "";
  let times: AlmanacTimeSlot[] = [];
  let eightChar = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = lunar as any;
    yi = Array.isArray(L.getDayYi?.()) ? L.getDayYi().map(String) : [];
    ji = Array.isArray(L.getDayJi?.()) ? L.getDayJi().map(String) : [];
    naYin = String(L.getDayNaYin?.() ?? "");
    chong = String(L.getDayChongDesc?.() ?? L.getDayChong?.() ?? "");
    sha = String(L.getDaySha?.() ?? "");
    tianShen = String(L.getDayTianShen?.() ?? "");
    const rawTimes = L.getTimes?.() ?? [];
    const seen = new Set<string>();
    for (const slot of rawTimes) {
      const zhi = String(slot.getZhi?.() ?? "");
      if (!zhi || seen.has(zhi)) continue;
      seen.add(zhi);
      const luckRaw = String(slot.getTianShenLuck?.() ?? "");
      const luck: "吉" | "凶" = luckRaw.includes("吉") ? "吉" : "凶";
      times.push({
        zhi,
        luck,
        ganZhi: String(slot.getGanZhi?.() ?? ""),
      });
    }
    // 最多 12 个地支
    times = times.slice(0, 12);
    try {
      const ec = L.getEightChar?.();
      if (ec) {
        eightChar = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()]
          .map((x: unknown) => String(x ?? ""))
          .filter(Boolean)
          .join(" ");
      }
    } catch {
      /* optional */
    }
  } catch {
    /* almanac extras optional */
  }

  return {
    gregorian: { year, month, day },
    weekday,
    lunar: {
      year: lunar.getYear(),
      month: absMonth,
      day: lunarDay,
      isLeapMonth,
      zodiac: String(lunar.getYearShengXiao()),
      ganzhi: String(lunar.getYearInGanZhi()),
      monthName: monthNameFinal,
      dayName: String(lunar.getDayInChinese()),
    },
    solarTerm,
    chinaHoliday,
    canadaHoliday: canadaHolidayName(year, month, day),
    yi,
    ji,
    naYin,
    chong,
    sha,
    tianShen,
    times,
    eightChar,
  };
}

/**
 * 6×7 month grid, weeks start on Monday.
 * Cells include trailing/leading days from adjacent months.
 */
export function getMonthCalendar(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month - 1, 1);
  // JS: 0=Sun … 6=Sat → Monday-first index
  const firstDow = first.getDay(); // 0 Sun
  const mondayIndex = firstDow === 0 ? 6 : firstDow - 1;

  const start = new Date(year, month - 1, 1 - mondayIndex);
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      row.push(getCalendarDay(cell.getFullYear(), cell.getMonth() + 1, cell.getDate()));
    }
    weeks.push(row);
  }
  return weeks;
}
