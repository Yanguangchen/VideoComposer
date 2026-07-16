// @vitest-environment jsdom

import assert from "node:assert/strict";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, it, vi } from "vitest";

import { useRender } from "../src/hooks/useRender";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("useRender", () => {
  it("polls, downloads a successful video, and reports busy transitions", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("session-id");
    const createObjectURL = vi.fn(() => "blob:video");
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    globalThis.fetch = vi.fn(async (input) => {
      if (String(input).startsWith("/api/render/progress")) {
        return Response.json({ progress: 120, label: "Rendering frames…", active: true });
      }
      return new Response("video", {
        status: 200,
        headers: { "Content-Type": "video/mp4" },
      });
    });
    const onBusyChange = vi.fn();
    const getInputProps = vi.fn(async () => ({ imageSrc: "image", brandId: "brand" }) as never);
    const { result } = renderHook(() => useRender({
      compositionId: "SingleImage",
      getInputProps,
      onBusyChange,
    }));

    await act(async () => result.current.start());
    assert.deepEqual(onBusyChange.mock.calls.map((call) => call[0]), [true, false]);
    assert.equal(result.current.lastError, null);
    assert.equal(createObjectURL.mock.calls.length, 1);
    // The rendered video is retained (not revoked) so it can be downloaded again.
    assert.equal(revokeObjectURL.mock.calls.length, 0);
    assert.equal(result.current.hasVideo, true);
    assert.equal(clickSpy.mock.calls.length, 1);
    assert.equal(result.current.isRendering, false);
    assert.equal(result.current.progress, 0);
    assert.equal(result.current.phaseLabel, "");
    const renderCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find((call) => call[0] === "/api/render");
    const body = JSON.parse(String(renderCall?.[1]?.body));
    assert.equal(body.sessionId, "session-id");
    assert.equal(body.compositionId, "SingleImage");

    // The Download button re-saves the same video without another render.
    act(() => result.current.download());
    assert.equal(clickSpy.mock.calls.length, 2);
    assert.equal(createObjectURL.mock.calls.length, 1);
  });

  it("surfaces API errors and clears them", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      if (String(input).startsWith("/api/render/progress")) return new Response("poll failed", { status: 500 });
      return Response.json({ error: "renderer unavailable" }, { status: 503 });
    });
    const { result } = renderHook(() => useRender({
      compositionId: "BeforeAfter",
      getInputProps: async () => ({ brandId: "brand" }) as never,
    }));
    await act(async () => result.current.start());
    assert.equal(result.current.lastError, "renderer unavailable");
    act(() => result.current.clearError());
    assert.equal(result.current.lastError, null);
  });

  it("rejects non-video success responses", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      if (String(input).startsWith("/api/render/progress")) {
        return Response.json({ progress: -5, label: 42 });
      }
      return new Response("unexpected response", { status: 200, headers: { "Content-Type": "text/plain" } });
    });
    const { result } = renderHook(() => useRender({
      compositionId: "Carousel",
      getInputProps: async () => ({ brandId: "brand" }) as never,
    }));
    await act(async () => result.current.start());
    assert.equal(result.current.lastError, "unexpected response");
  });

  it("handles input preparation and transient polling failures", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      if (String(input).startsWith("/api/render/progress")) throw new Error("temporary network issue");
      throw new Error("render should not be called");
    });
    const { result } = renderHook(() => useRender({
      compositionId: "BeforeAfter",
      getInputProps: async () => { throw "preparation failed"; },
    }));
    await act(async () => result.current.start());
    assert.equal(result.current.lastError, "Export failed. Check your connection and try again.");
  });

  it("cleans up active polling when unmounted", async () => {

    let resolveInput!: (value: never) => void;
    const pending = new Promise<never>((resolve) => { resolveInput = resolve; });
    globalThis.fetch = vi.fn(async () => Response.json({}));
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { result, unmount } = renderHook(() => useRender({
      compositionId: "BeforeAfter",
      getInputProps: () => pending,
    }));
    act(() => { void result.current.start(); });
    assert.equal(result.current.isRendering, true);
    unmount();
    assert.ok(clearIntervalSpy.mock.calls.length > 0);
    resolveInput({ brandId: "brand" } as never);
  });
});
