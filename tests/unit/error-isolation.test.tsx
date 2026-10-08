import React from "react";
import { describe, it, expect } from "vitest";
import { sanitizeErrorMessage, containsSensitiveInfo } from "@/lib/safe-error";
import { withTimeout, TimeoutError } from "@/lib/with-timeout";
import { WidgetErrorBoundary } from "@/components/WidgetErrorBoundary";

describe("sanitizeErrorMessage", () => {
  it("strips tokens and stacks", () => {
    expect(sanitizeErrorMessage("Bearer abc.def.ghi failed")).toBe(
      "暂时无法加载",
    );
    expect(sanitizeErrorMessage("refresh_token=xyz leaked")).toBe(
      "暂时无法加载",
    );
    expect(containsSensitiveInfo("Authorization: Bearer secret")).toBe(true);
  });

  it("keeps short safe messages", () => {
    expect(sanitizeErrorMessage("请求超时")).toBe("请求超时");
    expect(sanitizeErrorMessage(new Error("网络错误"))).toBe("网络错误");
  });
});

describe("withTimeout", () => {
  it("resolves when fast enough", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it("rejects with TimeoutError", async () => {
    const slow = new Promise<number>((r) => setTimeout(() => r(1), 500));
    await expect(withTimeout(slow, 20)).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe("WidgetErrorBoundary", () => {
  it("getDerivedStateFromError sanitizes message", () => {
    const state = WidgetErrorBoundary.getDerivedStateFromError(
      new Error("Bearer secret-token explode"),
    );
    expect(state.hasError).toBe(true);
    expect(state.message).not.toContain("secret-token");
    expect(state.message).not.toContain("Bearer");
    expect(containsSensitiveInfo(state.message)).toBe(false);
  });

  it("safe errors pass through sanitized first line", () => {
    const state = WidgetErrorBoundary.getDerivedStateFromError(
      new Error("同步失败"),
    );
    expect(state.hasError).toBe(true);
    expect(state.message).toBe("同步失败");
  });
});
