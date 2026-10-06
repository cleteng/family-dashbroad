"use client";

import { mergeCalendarConfig } from "./config";

export function CalendarEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const cfg = mergeCalendarConfig(config);

  return (
    <div className="space-y-3 text-sm" data-testid="calendar-editor">
      <label className="flex items-center justify-between gap-2">
        <span>周起始</span>
        <select
          className="rounded border border-zinc-300 px-2 py-1"
          value={cfg.weekStart}
          onChange={(e) =>
            onChange({
              ...cfg,
              weekStart: e.target.value as "monday" | "sunday",
            })
          }
          data-testid="calendar-week-start"
        >
          <option value="monday">周一</option>
          <option value="sunday">周日</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={cfg.showLunar}
          onChange={(e) => onChange({ ...cfg, showLunar: e.target.checked })}
          data-testid="calendar-show-lunar"
        />
        <span>显示农历</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={cfg.showCanadaHolidays}
          onChange={(e) => onChange({ ...cfg, showCanadaHolidays: e.target.checked })}
          data-testid="calendar-show-canada"
        />
        <span>显示加拿大节假日标记</span>
      </label>
    </div>
  );
}
