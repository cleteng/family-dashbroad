import { describe, it, expect } from "vitest";
import { getCalendarDay, getMonthCalendar } from "@/lib/calendar";

describe("getCalendarDay — China lunar boundaries", () => {
  it("2026-02-17 is 春节 (lunar 正月初一)", () => {
    const d = getCalendarDay(2026, 2, 17);
    expect(d.lunar.month).toBe(1);
    expect(d.lunar.day).toBe(1);
    expect(d.lunar.isLeapMonth).toBe(false);
    expect(d.chinaHoliday).toBe("春节");
    expect(d.weekday).toBeTruthy();
  });

  it("2026-02-16 is 除夕", () => {
    const d = getCalendarDay(2026, 2, 16);
    expect(d.chinaHoliday).toBe("除夕");
  });
});

describe("getCalendarDay — leap month", () => {
  it("2028-06-23 is 闰五月", () => {
    const d = getCalendarDay(2028, 6, 23);
    expect(d.lunar.isLeapMonth).toBe(true);
    expect(d.lunar.month).toBe(5);
    expect(d.lunar.monthName).toContain("闰");
  });
});

describe("getCalendarDay — solar term", () => {
  it("2026-04-05 is 清明", () => {
    const d = getCalendarDay(2026, 4, 5);
    expect(d.solarTerm).toBe("清明");
    expect(d.chinaHoliday).toBe("清明节");
  });
});

describe("getCalendarDay — fixed China holidays", () => {
  it("元旦 / 劳动节 / 国庆", () => {
    expect(getCalendarDay(2026, 1, 1).chinaHoliday).toBe("元旦");
    expect(getCalendarDay(2026, 5, 1).chinaHoliday).toBe("劳动节");
    expect(getCalendarDay(2026, 10, 1).chinaHoliday).toBe("国庆节");
  });
});

describe("getCalendarDay — Canada holidays", () => {
  it("Canada Day 07-01", () => {
    expect(getCalendarDay(2026, 7, 1).canadaHoliday).toBe("Canada Day");
  });

  it("St-Jean-Baptiste 06-24", () => {
    expect(getCalendarDay(2026, 6, 24).canadaHoliday).toBe("St-Jean-Baptiste Day");
  });

  it("Christmas 12-25", () => {
    expect(getCalendarDay(2026, 12, 25).canadaHoliday).toBe("Christmas Day");
  });

  it("Family Day is 3rd Monday of February", () => {
    // 2026-02-16 is 3rd Monday of Feb 2026
    const d = getCalendarDay(2026, 2, 16);
    expect(d.canadaHoliday).toBe("Family Day");
  });
});

describe("getCalendarDay — weekday", () => {
  it("returns Chinese weekday", () => {
    // 2026-01-05 is Monday
    expect(getCalendarDay(2026, 1, 5).weekday).toBe("一");
    // 2026-01-04 is Sunday
    expect(getCalendarDay(2026, 1, 4).weekday).toBe("日");
  });
});

describe("getMonthCalendar", () => {
  it("returns 6x7 grid", () => {
    const grid = getMonthCalendar(2026, 2);
    expect(grid).toHaveLength(6);
    for (const row of grid) {
      expect(row).toHaveLength(7);
    }
    // first cell weekday should be 一 (Monday-start)
    expect(grid[0][0].weekday).toBe("一");
  });
});
