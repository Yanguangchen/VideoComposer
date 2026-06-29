// @vitest-environment jsdom

import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

vi.mock("remotion", () => ({
  staticFile: (path: string) => `/static/${path}`,
}));

import { fileToDataUrl } from "../src/lib/files";
import {
  readSimulatedSignedIn,
  SIMULATED_AUTH_STORAGE_KEY,
  writeSimulatedSignedIn,
} from "../src/lib/simulated-auth";
import { PIXEL, resolveMediaSrc } from "../src/remotion/media-utils";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("simulated authentication storage", () => {
  it("reads, writes, and removes the sign-in marker", () => {
    assert.equal(readSimulatedSignedIn(), false);
    writeSimulatedSignedIn(true);
    assert.equal(window.localStorage.getItem(SIMULATED_AUTH_STORAGE_KEY), "1");
    assert.equal(readSimulatedSignedIn(), true);
    writeSimulatedSignedIn(false);
    assert.equal(readSimulatedSignedIn(), false);
  });
});

describe("file conversion", () => {
  it("converts a File to a data URL", async () => {
    const result = await fileToDataUrl(new File(["hello"], "hello.txt", { type: "text/plain" }));
    assert.equal(result, "data:text/plain;base64,aGVsbG8=");
  });

  it("rejects when FileReader fails", async () => {
    const error = new DOMException("failed");
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function () {
      Object.defineProperty(this, "error", { value: error });
      this.onerror?.(new ProgressEvent("error"));
    });
    await assert.rejects(fileToDataUrl(new File([], "bad.txt")), DOMException);
  });
});

describe("Remotion media source resolution", () => {
  it("uses a pixel fallback for empty sources", () => {
    assert.equal(resolveMediaSrc(""), PIXEL);
  });

  it("keeps absolute browser sources unchanged", () => {
    for (const source of ["https://example.test/a.png", "data:image/png,x", "blob:test"]) {
      assert.equal(resolveMediaSrc(source), source);
    }
  });

  it("maps public paths through staticFile", () => {
    assert.equal(resolveMediaSrc("/images/a.png"), "/static/images/a.png");
    assert.equal(resolveMediaSrc("images/a.png"), "/static/images/a.png");
  });
});
