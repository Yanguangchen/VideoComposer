import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFirebaseAuth: vi.fn(() => ({ id: "auth" })),
  signInWithPopup: vi.fn(),
  firebaseSignOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));
vi.mock("../src/lib/firebase", () => ({ getFirebaseAuth: mocks.getFirebaseAuth }));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  signInWithPopup: mocks.signInWithPopup,
  signOut: mocks.firebaseSignOut,
  onAuthStateChanged: mocks.onAuthStateChanged,
}));

import { onAuthChange, signInWithGoogle, signOut } from "../src/lib/auth";

describe("authentication adapters", () => {
  it("signs in with Google and returns the user", async () => {
    const user = { uid: "user" };
    mocks.signInWithPopup.mockResolvedValue({ user });
    assert.equal(await signInWithGoogle(), user);
    assert.equal(mocks.signInWithPopup.mock.calls[0]?.[0]?.id, "auth");
  });

  it("signs out through Firebase", async () => {
    await signOut();
    assert.deepEqual(mocks.firebaseSignOut.mock.calls[0], [{ id: "auth" }]);
  });

  it("subscribes to authentication changes", () => {
    const unsubscribe = () => undefined;
    const callback = vi.fn();
    mocks.onAuthStateChanged.mockReturnValue(unsubscribe);
    assert.equal(onAuthChange(callback), unsubscribe);
    assert.deepEqual(mocks.onAuthStateChanged.mock.calls[0], [{ id: "auth" }, callback]);
  });
});
