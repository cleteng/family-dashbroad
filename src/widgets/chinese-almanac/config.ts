import { z } from "zod";

export const CHINESE_ALMANAC_TYPE = "chinese-almanac" as const;

export const chineseAlmanacMetadata = {
  name: "传统挂历",
  description: "单日传统挂历：公历大字、农历、节气与节假日",
} as const;

export const chineseAlmanacDefaultConfig = {
  showNavigation: true,
};

export const chineseAlmanacConfigSchema = z.object({
  showNavigation: z.boolean().optional(),
});

export type ChineseAlmanacConfig = {
  showNavigation: boolean;
};

export function mergeChineseAlmanacConfig(
  partial: Record<string, unknown> | null | undefined,
): ChineseAlmanacConfig {
  const base = { ...chineseAlmanacDefaultConfig, ...(partial ?? {}) };
  const parsed = chineseAlmanacConfigSchema.parse(base);
  return {
    showNavigation: parsed.showNavigation ?? chineseAlmanacDefaultConfig.showNavigation,
  };
}

/** Date number color: holiday red, otherwise traditional green. */
export function almanacDateColorClass(chinaHoliday: string | null): string {
  return chinaHoliday ? "text-red-600" : "text-green-700";
}
