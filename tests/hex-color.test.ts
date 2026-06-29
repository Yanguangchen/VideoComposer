import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { normalizeHexColor } from "../src/lib/hex-color";

describe("normalizeHexColor", () => {
  it("normalizes valid colors", () => {
    assert.equal(normalizeHexColor("  #Aa12fF  ", "#000000"), "#Aa12fF");
    assert.equal(normalizeHexColor("abcdef", "#000000"), "#abcdef");
    assert.equal(normalizeHexColor("#aB3", "#000000"), "#aaBB33");
  });

  it("returns the fallback for invalid input", () => {
    assert.equal(normalizeHexColor("not-a-color", "#123456"), "#123456");
  });
});
