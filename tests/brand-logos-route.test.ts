import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ readdir: vi.fn() }));
vi.mock("fs/promises", () => ({ readdir: mocks.readdir }));

import { GET } from "../src/app/api/brand-logos/[brandId]/route";

afterEach(() => mocks.readdir.mockReset());

function context(brandId: string) {
  return { params: Promise.resolve({ brandId }) };
}

describe("GET /api/brand-logos/[brandId]", () => {
  it("rejects unknown brands", async () => {
    const response = await GET(new Request("http://localhost"), context("missing"));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Unknown brand" });
  });

  it("reports missing logo folders without failing the request", async () => {
    mocks.readdir.mockRejectedValue(new Error("missing"));
    const response = await GET(new Request("http://localhost"), context("le-motor"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      files: [],
      folder: "assets/logos/le-motor",
      message: "Folder missing or unreadable",
    });
  });

  it("filters and sorts image filenames", async () => {
    mocks.readdir.mockResolvedValue(["z.webp", "notes.txt", ".hidden.png", "A.svg"]);
    const response = await GET(new Request("http://localhost"), context("le-motor"));
    assert.deepEqual(await response.json(), {
      files: ["A.svg", "z.webp"],
      folder: "assets/logos/le-motor",
    });
  });
});
