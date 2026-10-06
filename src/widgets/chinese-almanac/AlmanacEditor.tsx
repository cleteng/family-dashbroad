"use client";

import { mergeChineseAlmanacConfig } from "./config";

export function AlmanacEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const cfg = mergeChineseAlmanacConfig(config);

  return (
    <div className="space-y-3 text-sm" data-testid="chinese-almanac-editor">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={cfg.showNavigation}
          onChange={(e) => onChange({ ...cfg, showNavigation: e.target.checked })}
          data-testid="almanac-show-nav"
        />
        <span>显示前一天 / 后一天</span>
      </label>
    </div>
  );
}
