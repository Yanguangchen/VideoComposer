import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";

import { formatRenderError } from "../src/lib/render-error";

const originalRailwayEnvironment = process.env.RAILWAY_ENVIRONMENT;

afterEach(() => {
  if (originalRailwayEnvironment === undefined) delete process.env.RAILWAY_ENVIRONMENT;
  else process.env.RAILWAY_ENVIRONMENT = originalRailwayEnvironment;
});

describe("formatRenderError", () => {
  it("handles non-Error values and process signals", () => {
    assert.match(formatRenderError("failed"), /unknown reason/);
    assert.match(formatRenderError(new Error("worker SIGKILL")), /out of memory/);
    assert.match(formatRenderError(new Error("worker SIGTERM")), /terminated unexpectedly/);
  });

  it("adds Railway context for a missing browser", () => {
    process.env.RAILWAY_ENVIRONMENT = "production";
    const result = formatRenderError(new Error("chrome executable not found"));
    assert.match(result, /headless browser is missing/);
    assert.match(result, /On Railway/);
  });

  it("categorizes common render failures", () => {
    assert.match(formatRenderError(new Error("Module not found: encoder")), /required module/);
    assert.match(formatRenderError(new Error("could not launch chromium")), /Could not start/);
    assert.equal(
      formatRenderError(new Error("ffmpeg codec failed")),
      "Video encoding failed: ffmpeg codec failed",
    );
    assert.match(formatRenderError(new Error("request ETIMEDOUT")), /timed out/);
    assert.match(formatRenderError(new Error("ENOSPC")), /disk space/);
    assert.match(formatRenderError(new Error("EACCES")), /Permission denied/);
  });

  it("returns ordinary messages and truncates long ones", () => {
    assert.equal(formatRenderError(new Error("ordinary failure")), "ordinary failure");
    const result = formatRenderError(new Error("x".repeat(450)));
    assert.equal(result.length, 401);
    assert.ok(result.endsWith("…"));
  });
});
