import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";

import {
  clearRenderProgress,
  getRenderProgress,
  setRenderProgress,
} from "../src/lib/render-progress-store";

const ids = new Set<string>();
const originalDateNow = Date.now;

function testId(name: string) {
  const value = `test-${name}-${Math.random()}`;
  ids.add(value);
  return value;
}

afterEach(() => {
  Date.now = originalDateNow;
  for (const sessionId of ids) clearRenderProgress(sessionId);
  ids.clear();
});

describe("render progress store", () => {
  it("creates state with defaults and merges partial updates", () => {
    const sessionId = testId("merge");
    setRenderProgress(sessionId, { progress: 0.25 });
    assert.deepEqual(getRenderProgress(sessionId), { progress: 0.25, label: "Starting…" });
    setRenderProgress(sessionId, { label: "Encoding" });
    assert.deepEqual(getRenderProgress(sessionId), { progress: 0.25, label: "Encoding" });
  });

  it("clears state", () => {
    const sessionId = testId("clear");
    setRenderProgress(sessionId, { progress: 1, label: "Done" });
    clearRenderProgress(sessionId);
    assert.equal(getRenderProgress(sessionId), null);
  });

  it("prunes entries older than fifteen minutes", () => {
    const sessionId = testId("expired");
    let now = 1_000_000;
    Date.now = () => now;
    setRenderProgress(sessionId, { progress: 0.5, label: "Rendering" });
    now += 15 * 60 * 1000 + 1;
    assert.equal(getRenderProgress(sessionId), null);
  });
});
