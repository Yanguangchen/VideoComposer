import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { uiLayerMotion } from "../src/remotion/ui-motion";

describe("uiLayerMotion", () => {
  it("starts hidden, becomes visible, and exits hidden", () => {
    const start = uiLayerMotion(0, 150, 8, 1);
    const middle = uiLayerMotion(70, 150, 8, 1);
    const end = uiLayerMotion(149, 150, 8, 1);
    assert.equal(start.opacity, 0);
    assert.equal(start.translateY, 52);
    assert.ok(middle.opacity > 0.99);
    assert.equal(middle.translateY, 0);
    assert.equal(end.opacity, 0);
    assert.equal(end.translateY, -40);
  });

  it("keeps short and invalid-duration animations finite", () => {
    for (const args of [
      [0, 1, 20, 3],
      [0, 0, 0, 0],
      [5, 8, 0, 2],
    ] as const) {
      const motion = uiLayerMotion(...args);
      assert.equal(Number.isFinite(motion.opacity), true);
      assert.equal(Number.isFinite(motion.translateY), true);
      assert.ok(motion.opacity >= 0 && motion.opacity <= 1);
    }
  });
});
