import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";

import { POST } from "../src/app/api/gemini/route";

const originalApiKey = process.env.GEMINI_API_KEY;
const originalFetch = globalThis.fetch;

function request(body: unknown): Request {
  return new Request("http://localhost/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
  globalThis.fetch = originalFetch;
});

describe("POST /api/gemini", () => {
  it("reports missing server configuration", async () => {
    delete process.env.GEMINI_API_KEY;
    const response = await POST(request({ userPrompt: "Write a caption" }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /GEMINI_API_KEY/);
  });

  it("rejects invalid JSON and empty prompts", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const invalid = await POST(
      new Request("http://localhost/api/gemini", { method: "POST", body: "{" }),
    );
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { error: "Invalid JSON body." });
    const empty = await POST(request({ userPrompt: "   " }));
    assert.equal(empty.status, 400);
    assert.match((await empty.json()).error, /Write a prompt/);
  });

  it("sends a clamped prompt and returns generated text", async () => {
    process.env.GEMINI_API_KEY = "key with spaces";
    let calledUrl = "";
    let sentBody: { contents: Array<{ parts: Array<{ text: string }> }> } | undefined;
    globalThis.fetch = async (input, init) => {
      calledUrl = String(input);
      sentBody = JSON.parse(String(init?.body));
      return Response.json({
        candidates: [{ content: { parts: [{ text: " Hello" }, { text: " world " }] } }],
      });
    };
    const response = await POST(
      request({
        brandName: " Brand ",
        brandContext: "x".repeat(8_100),
        userPrompt: " Launch ",
      }),
    );
    assert.deepEqual(await response.json(), { text: "Hello world" });
    assert.match(calledUrl, /key=key%20with%20spaces$/);
    const prompt = sentBody?.contents[0]?.parts[0]?.text ?? "";
    assert.match(prompt, /Brand: Brand/);
    assert.match(prompt, /User request:\nLaunch$/);
    assert.ok(prompt.length < 8_700);
  });

  it("maps network and upstream errors", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    globalThis.fetch = async () => {
      throw new Error("network down");
    };
    const network = await POST(request({ userPrompt: "Caption" }));
    assert.equal(network.status, 502);
    assert.match((await network.json()).error, /network down/);

    globalThis.fetch = async () =>
      Response.json({ error: { message: "quota exceeded" } }, { status: 429 });
    const quota = await POST(request({ userPrompt: "Caption" }));
    assert.equal(quota.status, 429);
    assert.match((await quota.json()).error, /quota exceeded/);

    globalThis.fetch = async () => new Response("not json", { status: 500 });
    const invalidUpstream = await POST(request({ userPrompt: "Caption" }));
    assert.equal(invalidUpstream.status, 502);
    assert.match((await invalidUpstream.json()).error, /HTTP 500/);
  });

  it("handles blocked and empty successful responses", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    globalThis.fetch = async () => Response.json({ promptFeedback: { blockReason: "SAFETY" } });
    const blocked = await POST(request({ userPrompt: "Caption" }));
    assert.equal(blocked.status, 422);
    assert.match((await blocked.json()).error, /SAFETY/);

    globalThis.fetch = async () => Response.json({ candidates: [] });
    const empty = await POST(request({ userPrompt: "Caption" }));
    assert.equal(empty.status, 502);
    assert.match((await empty.json()).error, /empty response/);
  });
});
