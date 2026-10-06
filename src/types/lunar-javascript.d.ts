declare module "lunar-javascript" {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getWeek(): number;
    next(days: number): Solar;
    toYmd(): string;
    getLunar(): Lunar;
  }

  export class Lunar {
    getYear(): number;
    /** Negative if leap month */
    getMonth(): number;
    getDay(): number;
    getYearShengXiao(): string;
    getYearInGanZhi(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    /** Solar term name if today is a jieqi day, else empty string */
    getJieQi(): string;
  }
}
