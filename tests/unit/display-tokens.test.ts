import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  generateDisplayToken,
  hashDisplayToken,
  listDisplayTokens,
} from "@/lib/display-tokens";
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
    expect(t).toHaveLength(64);
  });

  it("regenerate produces different hash (old invalid, new valid format)", () => {
    const oldPlain = generateDisplayToken();
    const oldHash = hashDisplayToken(oldPlain);
    const newPlain = generateDisplayToken();
    const newHash = hashDisplayToken(newPlain);

    expect(newPlain).toMatch(/^[0-9a-f]{64}$/);
    expect(newHash).not.toBe(oldHash);
    expect(hashDisplayToken(oldPlain)).toBe(oldHash);
    expect(hashDisplayToken(oldPlain)).not.toBe(newHash);
  });
});

describe("listDisplayTokens response whitelist", () => {
  it("list items never expose token or tokenHash fields", () => {
    const items = listDisplayTokens("nonexistent-dashboard-id");
    expect(Array.isArray(items)).toBe(true);
    for (const item of items) {
      const keys = Object.keys(item).sort();
      expect(keys).toEqual(
        ["createdAt", "id", "isActive", "lastUsedAt", "name", "updatedAt"].sort(),
      );
      expect(item).not.toHaveProperty("token");
      expect(item).not.toHaveProperty("tokenHash");
    }

    const sample = {
      id: "x",
      name: null as string | null,
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: null as Date | null,
      updatedAt: new Date(),
    };
    expect("token" in sample).toBe(false);
    expect("tokenHash" in sample).toBe(false);
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
