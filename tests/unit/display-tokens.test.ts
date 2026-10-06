import { describe, it, expect } from "vitest";
import {
  generateDisplayToken,
  hashDisplayToken,
} from "@/lib/display-tokens";
import { renderToString } from "react-dom/server";
import React from "react";
import { DisplayBoard } from "@/components/display/DisplayBoard";

describe("display token hash", () => {
  it("same plaintext → same hash", () => {
    const t = "abc123token";
    expect(hashDisplayToken(t)).toBe(hashDisplayToken(t));
  });

  it("different plaintext → different hash", () => {
    expect(hashDisplayToken("a")).not.toBe(hashDisplayToken("b"));
  });

  it("generateDisplayToken is 64 hex chars", () => {
    const t = generateDisplayToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("DisplayBoard unknown widget", () => {
  it("renders placeholder without throw", () => {
    const html = renderToString(
      React.createElement(DisplayBoard, {
        widgets: [
          {
            id: "w1",
            type: "weather",
            title: null,
            config: null,
          },
        ],
        layouts: [
          {
            widgetId: "w1",
            breakpoint: "desktop",
            x: 0,
            y: 0,
            w: 4,
            h: 3,
          },
        ],
      }),
    );
    expect(html).toContain("暂不支持");
  });
});
