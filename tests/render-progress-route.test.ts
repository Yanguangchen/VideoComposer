import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";

import { GET } from "../src/app/api/render/progress/route";
import { clearRenderProgress, setRenderProgress } from "../src/lib/render-progress-store";

const sessionId = "route-test-session";

afterEach(() => clearRenderProgress(sessionId));

describe("GET /api/render/progress", () => {
  it("rejects missing, short, and overlong session IDs", async () => {
    for (const query of ["", "?sessionId=short", `?sessionId=${"x".repeat(129)}`]) {
      const response = await GET(new Request(`http://localhost/api/render/progress${query}`));
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "Invalid or missing sessionId" });
    }
  });

  it("returns an inactive waiting state for an unknown session", async () => {
    const response = await GET(
      new Request("http://localhost/api/render/progress?sessionId=unknown-session"),
    );
    assert.deepEqual(await response.json(), { progress: 0, label: "Waiting…", active: false });
  });

  it("returns active progress", async () => {
    setRenderProgress(sessionId, { progress: 0.75, label: "Encoding" });
    const response = await GET(
      new Request(`http://localhost/api/render/progress?sessionId=${sessionId}`),
    );
    assert.deepEqual(await response.json(), { progress: 0.75, label: "Encoding", active: true });
  });
});
