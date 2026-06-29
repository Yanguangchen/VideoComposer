import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  randomUUID: vi.fn(() => "render-id"),
  unlink: vi.fn(), readFile: vi.fn(), bundle: vi.fn(),
  ensureBrowser: vi.fn(), renderMedia: vi.fn(), selectComposition: vi.fn(),
  getServerlessExportBlockMessage: vi.fn(),
  formatRenderError: vi.fn((error: unknown) => error instanceof Error ? error.message : "unknown"),
  setRenderProgress: vi.fn(), clearRenderProgress: vi.fn(),
}));

vi.mock("crypto", () => ({ randomUUID: mocks.randomUUID }));
vi.mock("fs/promises", () => ({ unlink: mocks.unlink, readFile: mocks.readFile }));
vi.mock("@remotion/bundler", () => ({ bundle: mocks.bundle }));
vi.mock("@remotion/renderer", () => ({
  ensureBrowser: mocks.ensureBrowser,
  renderMedia: mocks.renderMedia,
  selectComposition: mocks.selectComposition,
}));
vi.mock("../src/lib/render-environment", () => ({
  getServerlessExportBlockMessage: mocks.getServerlessExportBlockMessage,
}));
vi.mock("../src/lib/render-error", () => ({ formatRenderError: mocks.formatRenderError }));
vi.mock("../src/lib/render-progress-store", () => ({
  setRenderProgress: mocks.setRenderProgress,
  clearRenderProgress: mocks.clearRenderProgress,
}));

import { POST } from "../src/app/api/render/route";

function request(body: unknown) {
  return new Request("http://localhost/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.randomUUID.mockReturnValue("render-id");
  mocks.formatRenderError.mockImplementation((error: unknown) => error instanceof Error ? error.message : "unknown");
  mocks.bundle.mockResolvedValue("serve-url");
  mocks.selectComposition.mockResolvedValue({ id: "composition" });
  mocks.readFile.mockResolvedValue(Buffer.from("video"));
  mocks.unlink.mockResolvedValue(undefined);
  mocks.getServerlessExportBlockMessage.mockReturnValue(null);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/render validation", () => {
  it("handles invalid JSON and missing input", async () => {
    const invalidJson = await POST(new Request("http://localhost", { method: "POST", body: "{" }));
    assert.equal(invalidJson.status, 500);
    const missing = await POST(request({ compositionId: "BeforeAfter" }));
    assert.equal(missing.status, 400);
    assert.match((await missing.json()).error, /Missing compositionId/);
  });

  it("rejects unknown compositions", async () => {
    const response = await POST(request({ compositionId: "Unknown", inputProps: {} }));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid compositionId" });
  });

  it("validates required media for every composition", async () => {
    const cases = [
      ["BeforeAfter", {}, "Missing before or after image."],
      ["SingleImage", {}, "Missing image."],
      ["Carousel", {}, "Add at least one slide."],
      ["Carousel", { slides: [{}] }, "Each slide needs an image."],
    ];
    for (const [compositionId, inputProps, message] of cases) {
      const response = await POST(request({ compositionId, inputProps }));
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: message });
    }
  });

  it("blocks unsupported serverless hosts before renderer setup", async () => {
    mocks.getServerlessExportBlockMessage.mockReturnValue("serverless blocked");
    const response = await POST(request({ compositionId: "SingleImage", inputProps: { imageSrc: "image" } }));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "serverless blocked" });
    assert.equal(mocks.ensureBrowser.mock.calls.length, 0);
  });
});

describe("POST /api/render orchestration", () => {
  it("normalizes input, renders video, reports progress, and cleans up", async () => {
    mocks.renderMedia.mockImplementation(async (options) => {
      assert.deepEqual(options.ffmpegOverride({ args: ["ffmpeg"] }).slice(-2), ["-threads", "4"]);
      options.onProgress({ progress: 0.5, stitchStage: "encoding" });
      options.onProgress({ progress: 1, stitchStage: "muxing" });
    });
    const response = await POST(request({
      compositionId: "SingleImage",
      sessionId: "valid-session",
      inputProps: {
        imageSrc: "image",
        brandId: "brand",
        textSizeScale: 10,
        logoOffsetXPx: -900,
        logoOffsetYPx: "invalid",
      },
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "video/mp4");
    assert.equal(Buffer.from(await response.arrayBuffer()).toString(), "video");
    const normalized = mocks.selectComposition.mock.calls[0]![0].inputProps;
    assert.equal(normalized.textSizeScale, 1.65);
    assert.equal(normalized.logoOffsetXPx, -400);
    assert.equal(normalized.logoOffsetYPx, 0);
    assert.equal(mocks.ensureBrowser.mock.calls.length, 1);
    assert.equal(mocks.unlink.mock.calls.length, 1);
    assert.deepEqual(mocks.clearRenderProgress.mock.calls[0], ["valid-session"]);
    assert.equal(
      mocks.setRenderProgress.mock.calls.some((call) => call[1].label === "Muxing audio and video…"),
      true,
    );
  });

  it("renders without progress state when the session ID is invalid", async () => {
    mocks.renderMedia.mockImplementation(async (options) => {
      options.onProgress({ progress: 0.5, stitchStage: "encoding" });
    });
    const response = await POST(request({
      compositionId: "BeforeAfter",
      sessionId: "short",
      inputProps: { topImageSrc: "before", bottomImageSrc: "after", brandId: "brand" },
    }));
    assert.equal(response.status, 200);
    assert.equal(mocks.setRenderProgress.mock.calls.length, 0);
    assert.equal(mocks.clearRenderProgress.mock.calls.length, 0);
  });

  it("formats renderer failures, marks progress failed, and removes temp output", async () => {
    mocks.renderMedia.mockRejectedValue(new Error("render exploded"));
    const response = await POST(request({
      compositionId: "Carousel",
      sessionId: "failure-session",
      inputProps: { slides: [{ imageSrc: "slide" }], brandId: "brand" },
    }));
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "render exploded" });
    assert.equal(mocks.unlink.mock.calls.length, 1);
    assert.equal(
      mocks.setRenderProgress.mock.calls.some((call) => call[1].label === "Failed"),
      true,
    );
    assert.deepEqual(mocks.clearRenderProgress.mock.calls.at(-1), ["failure-session"]);
  });

  it("ignores cleanup deletion failures after a successful read", async () => {
    mocks.unlink.mockRejectedValue(new Error("already removed"));
    const response = await POST(request({
      compositionId: "SingleImage",
      inputProps: { imageSrc: "image", brandId: "brand" },
    }));
    assert.equal(response.status, 200);
  });
});
