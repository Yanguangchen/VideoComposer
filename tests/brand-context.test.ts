import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  doc: vi.fn(() => ({ path: "brandContexts/brand" })),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "timestamp"),
  getDb: vi.fn(() => ({ id: "db" })),
}));
vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  onSnapshot: mocks.onSnapshot,
  setDoc: mocks.setDoc,
  serverTimestamp: mocks.serverTimestamp,
  Timestamp: class Timestamp {},
}));
vi.mock("../src/lib/firebase", () => ({ getDb: mocks.getDb }));

import {
  BRAND_CONTEXT_MAX_CHARS,
  clampBrandContextText,
  getBrandContext,
  saveBrandContext,
  subscribeBrandContext,
} from "../src/lib/brand-context";

afterEach(() => {
  for (const mock of Object.values(mocks)) mock.mockClear();
});

describe("brand context persistence", () => {
  it("clamps oversized text", () => {
    assert.equal(clampBrandContextText("short"), "short");
    assert.equal(
      clampBrandContextText("x".repeat(BRAND_CONTEXT_MAX_CHARS + 1)).length,
      BRAND_CONTEXT_MAX_CHARS,
    );
  });

  it("loads missing and populated contexts", async () => {
    mocks.getDoc.mockResolvedValueOnce({ exists: () => false });
    assert.deepEqual(await getBrandContext("brand"), {
      brandId: "brand",
      text: "",
      updatedAt: null,
    });
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ text: "voice", updatedAt: { toMillis: () => 42 } }),
    });
    assert.deepEqual(await getBrandContext("brand"), {
      brandId: "brand",
      text: "voice",
      updatedAt: 42,
    });
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ text: 4, updatedAt: null }),
    });
    assert.deepEqual(await getBrandContext("brand"), {
      brandId: "brand",
      text: "",
      updatedAt: null,
    });
  });

  it("subscribes to missing, populated, and error snapshots", () => {
    const onNext = vi.fn();
    const onError = vi.fn();
    const unsubscribe = () => undefined;
    mocks.onSnapshot.mockImplementation((_ref, next, error) => {
      next({ exists: () => false });
      next({
        exists: () => true,
        data: () => ({ text: "live", updatedAt: { toMillis: () => 9 } }),
      });
      next({ exists: () => true, data: () => ({ text: null, updatedAt: null }) });
      error(new Error("listen failed"));
      return unsubscribe;
    });
    assert.equal(subscribeBrandContext("brand", onNext, onError), unsubscribe);
    assert.deepEqual(
      onNext.mock.calls.map((call) => call[0]),
      [
        { brandId: "brand", text: "", updatedAt: null },
        { brandId: "brand", text: "live", updatedAt: 9 },
        { brandId: "brand", text: "", updatedAt: null },
      ],
    );
    assert.match(onError.mock.calls[0]![0].message, /listen failed/);
  });

  it("saves clamped text with a server timestamp", async () => {
    await saveBrandContext("brand", "x".repeat(BRAND_CONTEXT_MAX_CHARS + 10));
    assert.equal(mocks.setDoc.mock.calls[0]![1].text.length, BRAND_CONTEXT_MAX_CHARS);
    assert.deepEqual(mocks.setDoc.mock.calls[0]![2], { merge: true });
  });
});
