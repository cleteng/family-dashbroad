import { z } from "zod";

export const CLOCK_TYPE = "clock" as const;

export const clockDefaultConfig = {
  timezone: "America/Toronto",
  format: "24h" as const,
  showSeconds: true,
  showDate: true,
};

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const clockConfigSchema = z.object({
  timezone: z
    .string()
    .optional()
    .refine((tz) => tz === undefined || isValidTimeZone(tz), {
      message: "timezone must be a valid IANA time zone",
    }),
  format: z.enum(["12h", "24h"]).optional(),
  showSeconds: z.boolean().optional(),
  showDate: z.boolean().optional(),
});

export type ClockConfig = {
  timezone: string;
  format: "12h" | "24h";
  showSeconds: boolean;
  showDate: boolean;
};

export function mergeClockConfig(partial: Record<string, unknown> | null | undefined): ClockConfig {
  const base = { ...clockDefaultConfig, ...(partial ?? {}) };
  const parsed = clockConfigSchema.parse(base);
  return {
    timezone: parsed.timezone ?? clockDefaultConfig.timezone,
    format: parsed.format ?? clockDefaultConfig.format,
    showSeconds: parsed.showSeconds ?? clockDefaultConfig.showSeconds,
    showDate: parsed.showDate ?? clockDefaultConfig.showDate,
  };
}
