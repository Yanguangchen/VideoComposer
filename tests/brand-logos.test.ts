import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { filterLogoFilenames, pickDefaultLogoFile } from "../src/lib/brand-logos";

describe("pickDefaultLogoFile", () => {
  it("returns null for an empty list", () => assert.equal(pickDefaultLogoFile([]), null));

  it("uses the configured preference order", () => {
    assert.equal(pickDefaultLogoFile(["primary.png", "logo.jpg", "logo.svg"]), "logo.svg");
  });

  it("falls back alphabetically without mutating the input", () => {
    const files = ["zeta.webp", "alpha.png"];
    assert.equal(pickDefaultLogoFile(files), "alpha.png");
    assert.deepEqual(files, ["zeta.webp", "alpha.png"]);
  });
});

describe("filterLogoFilenames", () => {
  it("keeps supported image extensions case-insensitively", () => {
    assert.deepEqual(filterLogoFilenames(["a.PNG", "b.jpeg", "c.svg", "d.webp", "e.gif"]), [
      "a.PNG",
      "b.jpeg",
      "c.svg",
      "d.webp",
      "e.gif",
    ]);
  });

  it("removes hidden and unsupported files", () => {
    assert.deepEqual(filterLogoFilenames([".logo.png", "notes.txt", "video.mp4", "logo.png"]), [
      "logo.png",
    ]);
  });
});
