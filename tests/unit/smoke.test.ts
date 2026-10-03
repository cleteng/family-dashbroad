import { describe, it, expect } from "vitest";

describe("TASK-001 smoke", () => {
  it("passes a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("has expected environment shape", () => {
    expect(typeof process.env.NODE_ENV).toBe("string");
  });
});
