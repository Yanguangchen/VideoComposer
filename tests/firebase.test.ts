import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApps: vi.fn(),
  initializeApp: vi.fn(),
  getFirestore: vi.fn(),
  getStorage: vi.fn(),
  getAuth: vi.fn(),
}));
vi.mock("firebase/app", () => ({ getApps: mocks.getApps, initializeApp: mocks.initializeApp }));
vi.mock("firebase/firestore", () => ({ getFirestore: mocks.getFirestore }));
vi.mock("firebase/storage", () => ({ getStorage: mocks.getStorage }));
vi.mock("firebase/auth", () => ({ getAuth: mocks.getAuth }));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  for (const mock of Object.values(mocks)) mock.mockReset();
});

function configure() {
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "key";
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "project";
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "bucket";
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "app";
}

describe("Firebase singleton accessors", () => {
  it("reports and explains missing required configuration", async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    const firebase = await import("../src/lib/firebase");
    assert.equal(firebase.isFirebaseConfigured(), false);
    assert.throws(
      () => firebase.getFirebaseApp(),
      /NEXT_PUBLIC_FIREBASE_API_KEY.*PROJECT_ID.*STORAGE_BUCKET.*APP_ID/,
    );
  });

  it("initializes one app and caches all service instances", async () => {
    configure();
    const app = { name: "new" };
    const db = { kind: "db" };
    const storage = { kind: "storage" };
    const auth = { kind: "auth" };
    mocks.getApps.mockReturnValue([]);
    mocks.initializeApp.mockReturnValue(app);
    mocks.getFirestore.mockReturnValue(db);
    mocks.getStorage.mockReturnValue(storage);
    mocks.getAuth.mockReturnValue(auth);
    const firebase = await import("../src/lib/firebase");
    assert.equal(firebase.isFirebaseConfigured(), true);
    assert.equal(firebase.getFirebaseApp(), app);
    assert.equal(firebase.getFirebaseApp(), app);
    assert.equal(firebase.getDb(), db);
    assert.equal(firebase.getDb(), db);
    assert.equal(firebase.getStorageBucket(), storage);
    assert.equal(firebase.getStorageBucket(), storage);
    assert.equal(firebase.getFirebaseAuth(), auth);
    assert.equal(firebase.getFirebaseAuth(), auth);
    assert.equal(mocks.initializeApp.mock.calls.length, 1);
    assert.equal(mocks.getFirestore.mock.calls.length, 1);
  });

  it("reuses an existing Firebase app", async () => {
    configure();
    const existing = { name: "existing" };
    mocks.getApps.mockReturnValue([existing]);
    const firebase = await import("../src/lib/firebase");
    assert.equal(firebase.getFirebaseApp(), existing);
    assert.equal(mocks.initializeApp.mock.calls.length, 0);
  });
});
