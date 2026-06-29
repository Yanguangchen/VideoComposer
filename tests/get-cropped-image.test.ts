// @vitest-environment jsdom

import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

import { getCroppedImageBlob } from "../src/lib/get-cropped-image";

class SuccessfulImage {
  decoding = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

class FailedImage extends SuccessfulImage {
  override set src(_value: string) {
    queueMicrotask(() => this.onerror?.());
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getCroppedImageBlob", () => {
  it("loads, downsizes, draws, and encodes the crop", async () => {
    vi.stubGlobal("Image", SuccessfulImage);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      function (callback, type, quality) {
        assert.equal(type, "image/png");
        assert.equal(quality, 0.8);
        callback(new Blob(["image"], { type: "image/png" }));
      },
    );
    const blob = await getCroppedImageBlob(
      "source",
      { x: 10, y: 20, width: 4000, height: 2000 },
      { maxDimension: 1000, mimeType: "image/png", quality: 0.8 },
    );
    assert.equal(blob.type, "image/png");
    const canvas = drawImage.mock.instances[0] as unknown;
    assert.ok(canvas !== null);
    assert.deepEqual(drawImage.mock.calls[0]?.slice(1), [10, 20, 4000, 2000, 0, 0, 1000, 500]);
  });

  it("uses default output options and never creates a zero-sized canvas", async () => {
    vi.stubGlobal("Image", SuccessfulImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback, type, quality) => {
        assert.equal(type, "image/jpeg");
        assert.equal(quality, 0.92);

        callback(new Blob());
      },
    );
    await getCroppedImageBlob("source", { x: 0, y: 0, width: 0, height: 0 });
  });

  it("rejects image-load, missing-context, and encoding failures", async () => {
    vi.stubGlobal("Image", FailedImage);
    await assert.rejects(
      getCroppedImageBlob("bad", { x: 0, y: 0, width: 1, height: 1 }),
      /Failed to load image/,
    );

    vi.stubGlobal("Image", SuccessfulImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await assert.rejects(
      getCroppedImageBlob("source", { x: 0, y: 0, width: 1, height: 1 }),
      /canvas context/,
    );

    vi.restoreAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback(null),
    );
    await assert.rejects(
      getCroppedImageBlob("source", { x: 0, y: 0, width: 1, height: 1 }),
      /Canvas toBlob failed/,
    );
  });
});
