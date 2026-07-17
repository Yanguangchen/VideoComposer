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
  it("polls, downloads video, and reports busy transitions", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("session-id");
    const createObjectURL = vi.fn(() => "blob:video");
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    const downloadNames: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadNames.push(this.download);
    });
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
    // No caption provided → only the video is downloaded and its URL revoked.
    assert.equal(createObjectURL.mock.calls.length, 1);
    assert.equal(revokeObjectURL.mock.calls.length, 1);
    assert.deepEqual(downloadNames, ["single-brand.mp4"]);
    assert.equal(result.current.isRendering, false);
    assert.equal(result.current.progress, 0);
    assert.equal(result.current.phaseLabel, "");
    const renderCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find((call) => call[0] === "/api/render");
    const body = JSON.parse(String(renderCall?.[1]?.body));
    assert.equal(body.sessionId, "session-id");
    assert.equal(body.compositionId, "SingleImage");
  });

  it("downloads a matching caption .txt alongside the video when present", async () => {
    const createObjectURL = vi.fn(() => "blob:x");
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    const downloadNames: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadNames.push(this.download);
    });
    globalThis.fetch = vi.fn(async (input) => {
      if (String(input).startsWith("/api/render/progress")) return Response.json({});
      return new Response("video", { status: 200, headers: { "Content-Type": "video/mp4" } });
    });
    const { result } = renderHook(() => useRender({
      compositionId: "Carousel",
      getInputProps: async () => ({ brandId: "brand" }) as never,
      getCaption: () => "  Hello caption  ",
    }));

    await act(async () => result.current.start());
    // Both the video and the caption .txt download, sharing a stem.
    assert.deepEqual(downloadNames, ["carousel-brand.mp4", "carousel-brand.txt"]);
    assert.equal(result.current.lastError, null);
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
