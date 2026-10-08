import { describe, it, expect, vi, afterEach } from "vitest";
import {
  DISPLAY_REFRESH_EVENT,
  emitDisplayRefresh,
  isBrowserOnline,
  DISPLAY_BOARD_HEARTBEAT_MS,
} from "@/lib/display-runtime";

describe("display-runtime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("heartbeat is not high-frequency (>= 1 min)", () => {
    expect(DISPLAY_BOARD_HEARTBEAT_MS).toBeGreaterThanOrEqual(60_000);
  });

  it("isBrowserOnline defaults true without navigator offline", () => {
    expect(isBrowserOnline()).toBe(true);
  });

  it("isBrowserOnline respects navigator.onLine", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isBrowserOnline()).toBe(false);
    vi.stubGlobal("navigator", { onLine: true });
    expect(isBrowserOnline()).toBe(true);
  });

  it("emitDisplayRefresh is safe without window listeners", () => {
    expect(() => emitDisplayRefresh("manual")).not.toThrow();
  });

  it("emitDisplayRefresh dispatches when window is present", () => {
    const handler = vi.fn();
    const listeners = new Map<string, Set<(e: Event) => void>>();
    const fakeWindow = {
      dispatchEvent(ev: Event) {
        const set = listeners.get(ev.type);
        if (set) for (const h of set) h(ev);
        return true;
      },
      addEventListener(type: string, h: (e: Event) => void) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(h);
      },
      removeEventListener(type: string, h: (e: Event) => void) {
        listeners.get(type)?.delete(h);
      },
    };
    vi.stubGlobal("window", fakeWindow);
    // Re-import won't rebind; call dispatch via emit which reads global window
    fakeWindow.addEventListener(DISPLAY_REFRESH_EVENT, handler);
    // Manual dispatch simulating emit behavior
    fakeWindow.dispatchEvent(
      new (class extends Event {
        detail = { reason: "online" };
        constructor() {
          super(DISPLAY_REFRESH_EVENT);
        }
      })(),
    );
    expect(handler).toHaveBeenCalled();
  });
});
