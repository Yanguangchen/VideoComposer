import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ scanPublicMedia: vi.fn() }));
vi.mock("../src/lib/scan-public-media", () => ({ scanPublicMedia: mocks.scanPublicMedia }));

import { GET } from "../src/app/api/public-media/route";

afterEach(() => {
  vi.restoreAllMocks();
  mocks.scanPublicMedia.mockReset();
});

describe("GET /api/public-media", () => {
  it("returns scanned media", async () => {
    const data = {
      music: [{ id: "m", label: "Music", publicPath: "music/a.mp3" }],
      backgrounds: [{ id: "b", label: "Background", publicPath: "backgrounds/a.mp4" }],
    };
    mocks.scanPublicMedia.mockResolvedValue(data);
    const response = await GET();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), data);
  });

  it("returns a stable error payload when scanning fails", async () => {
    mocks.scanPublicMedia.mockRejectedValue(new Error("disk failed"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await GET();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: "Failed to scan public media",
      music: [],
      backgrounds: [],
    });
    assert.equal(console.error.mock.calls.length, 1);
  });
});
