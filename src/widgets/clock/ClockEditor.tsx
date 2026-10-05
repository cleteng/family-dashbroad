"use client";

import { clockDefaultConfig } from "./config";

const SUGGESTED_TIMEZONES = [
  "America/Toronto",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Europe/London",
  "UTC",
];

function resolve(config: Record<string, unknown>): {
  timezone: string;
  format: "12h" | "24h";
  showSeconds: boolean;
  showDate: boolean;
} {
  return {
    timezone: typeof config.timezone === "string" ? config.timezone : clockDefaultConfig.timezone,
    format:
      config.format === "12h" || config.format === "24h"
        ? config.format
        : clockDefaultConfig.format,
    showSeconds:
      typeof config.showSeconds === "boolean" ? config.showSeconds : clockDefaultConfig.showSeconds,
    showDate: typeof config.showDate === "boolean" ? config.showDate : clockDefaultConfig.showDate,
  };
}

export function ClockEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const c = resolve(config);

  function patch(partial: Record<string, unknown>) {
    onChange({ ...c, ...partial });
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-zinc-700">时区</span>
        <input
          list="clock-tz-suggestions"
          type="text"
          value={c.timezone}
          onChange={(e) => patch({ timezone: e.target.value })}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
        />
        <datalist id="clock-tz-suggestions">
          {SUGGESTED_TIMEZONES.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </label>

      <fieldset>
        <legend className="text-zinc-700">时间格式</legend>
        <div className="mt-1 flex gap-4">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name="clock-format"
              checked={c.format === "24h"}
              onChange={() => patch({ format: "24h" })}
            />
            24 小时
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name="clock-format"
              checked={c.format === "12h"}
              onChange={() => patch({ format: "12h" })}
            />
            12 小时
          </label>
        </div>
      </fieldset>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={c.showSeconds}
          onChange={(e) => patch({ showSeconds: e.target.checked })}
        />
        显示秒
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={c.showDate}
          onChange={(e) => patch({ showDate: e.target.checked })}
        />
        显示日期
      </label>
    </div>
  );
}
