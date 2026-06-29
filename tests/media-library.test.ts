// @vitest-environment jsdom

import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(() => "collection"),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => "doc"),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(() => "order"),
  query: vi.fn(() => "query"),
  serverTimestamp: vi.fn(() => "timestamp"),
  where: vi.fn(() => "where"),
  deleteObject: vi.fn(),
  getBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  storageRef: vi.fn((_bucket, path) => ({ path })),
  uploadBytesResumable: vi.fn(),
  getDb: vi.fn(() => "db"),
  getStorageBucket: vi.fn(() => "bucket"),
}));

vi.mock("firebase/firestore", () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  deleteDoc: mocks.deleteDoc,
  doc: mocks.doc,
  onSnapshot: mocks.onSnapshot,
  orderBy: mocks.orderBy,
  query: mocks.query,
  serverTimestamp: mocks.serverTimestamp,
  where: mocks.where,
  Timestamp: class Timestamp {},
}));
vi.mock("firebase/storage", () => ({
  deleteObject: mocks.deleteObject,
  getBytes: mocks.getBytes,
  getDownloadURL: mocks.getDownloadURL,
  ref: mocks.storageRef,
  uploadBytesResumable: mocks.uploadBytesResumable,
}));
vi.mock("../src/lib/firebase", () => ({
  getDb: mocks.getDb,
  getStorageBucket: mocks.getStorageBucket,
}));

import {
  deleteLibraryAsset,
  libraryAssetToFile,
  subscribeLibraryMedia,
  uploadLibraryMedia,
  type LibraryAsset,
} from "../src/lib/media-library";

const asset: LibraryAsset = {
  id: "asset-id",
  brandId: "brand",
  storagePath: "brands/brand/file.jpg",
  downloadUrl: "https://example.test/file.jpg",
  filename: "file.jpg",
  contentType: "image/jpeg",
  sizeBytes: 3,
  uploadedAt: 123,
};

afterEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.collection.mockReturnValue("collection");
  mocks.doc.mockReturnValue("doc");
  mocks.orderBy.mockReturnValue("order");
  mocks.query.mockReturnValue("query");
  mocks.serverTimestamp.mockReturnValue("timestamp");
  mocks.where.mockReturnValue("where");
  mocks.storageRef.mockImplementation((_bucket, path) => ({ path }));
  mocks.getDb.mockReturnValue("db");
  mocks.getStorageBucket.mockReturnValue("bucket");
  vi.restoreAllMocks();
});

describe("library subscriptions", () => {
  it("maps snapshots with defaults and forwards listener errors", () => {
    const onNext = vi.fn();
    const onError = vi.fn();
    const unsubscribe = () => undefined;
    mocks.onSnapshot.mockImplementation((_query, next, error) => {
      next({
        docs: [
          { id: "1", data: () => ({ ...asset, uploadedAt: { toMillis: () => 99 } }) },
          {
            id: "2",
            data: () => ({
              brandId: "brand",
              storagePath: "p",
              downloadUrl: "u",
              uploadedAt: null,
            }),
          },
        ],
      });
      error(new Error("listener failed"));
      return unsubscribe;
    });
    assert.equal(subscribeLibraryMedia("brand", onNext, onError), unsubscribe);
    assert.deepEqual(onNext.mock.calls[0]![0], [
      { ...asset, id: "1", uploadedAt: 99 },
      {
        id: "2",
        brandId: "brand",
        storagePath: "p",
        downloadUrl: "u",
        filename: "untitled",
        contentType: "application/octet-stream",
        sizeBytes: 0,
        uploadedAt: null,
      },
    ]);
    assert.match(onError.mock.calls[0]![0].message, /listener failed/);
  });
});

describe("library uploads", () => {
  it("returns immediately for an empty file list", async () => {
    assert.deepEqual(await uploadLibraryMedia("brand", []), []);
    assert.equal(mocks.getDb.mock.calls.length, 0);
  });

  it("uploads files, caps transfer progress, writes metadata, and reports completion", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("12345678-1234-1234-1234-123456789012");
    mocks.uploadBytesResumable.mockReturnValue({
      snapshot: { ref: "uploaded-ref" },
      on: (_event: string, progress: (s: object) => void, _error: object, complete: () => void) => {
        progress({ bytesTransferred: 10, totalBytes: 0 });
        progress({ bytesTransferred: 100, totalBytes: 100 });
        void complete();
      },
    });
    mocks.getDownloadURL.mockResolvedValue("https://download.test/file");
    mocks.addDoc.mockResolvedValue({ id: "doc-id" });
    const progress = vi.fn();
    const file = new File(["abc"], "photo.jpeg", { type: "image/jpeg" });
    const result = await uploadLibraryMedia("brand", [file], progress);
    assert.equal(result[0]?.id, "doc-id");
    assert.match(result[0]!.storagePath, /12345678123412341234123456789012\.jpg$/);
    assert.deepEqual(
      progress.mock.calls.map((call) => call[0].status),
      ["uploading", "uploading", "finalizing", "done"],
    );
    assert.equal(progress.mock.calls[1]![0].ratio, 0.99);
  });

  it("filters transfer and finalization failures from parallel results", async () => {
    const transferError = new Error("upload failed");
    let call = 0;
    mocks.uploadBytesResumable.mockImplementation(() => {
      call += 1;
      return {
        snapshot: { ref: `ref-${call}` },
        on: (
          _event: string,
          _progress: object,
          error: (e: Error) => void,
          complete: () => void,
        ) => {
          if (call === 1) error(transferError);
          else void complete();
        },
      };
    });
    mocks.getDownloadURL.mockRejectedValue("finalization failed");
    const progress = vi.fn();
    const files = [
      new File(["a"], "one.bad", { type: "text/plain" }),
      new File(["b"], "two", { type: "" }),
    ];
    assert.deepEqual(await uploadLibraryMedia("brand", files, progress), []);
    assert.deepEqual(
      progress.mock.calls.map((entry) => entry[0].status),
      ["error", "finalizing", "error"],
    );
    assert.equal(progress.mock.calls[2]![0].error, "finalization failed");
  });
});

describe("library deletion and downloads", () => {
  it("deletes storage before metadata and ignores already-missing objects", async () => {
    mocks.deleteObject.mockRejectedValue({ code: "storage/object-not-found" });
    await deleteLibraryAsset(asset);
    assert.deepEqual(mocks.deleteDoc.mock.calls[0], ["doc"]);
  });

  it("preserves metadata when storage deletion fails", async () => {
    mocks.deleteObject.mockRejectedValue(new Error("permission denied"));
    await assert.rejects(deleteLibraryAsset(asset), /permission denied/);
    assert.equal(mocks.deleteDoc.mock.calls.length, 0);
  });

  it("downloads assets as files", async () => {
    mocks.getBytes.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const file = await libraryAssetToFile(asset);
    assert.equal(file.name, "file.jpg");
    assert.equal(file.type, "image/jpeg");
    assert.equal(file.size, 3);
  });

  it("rewrites likely CORS failures and preserves unrelated errors", async () => {
    for (const error of [new Error("Failed to fetch"), { code: "storage/unknown" }]) {
      mocks.getBytes.mockRejectedValueOnce(error);
      await assert.rejects(libraryAssetToFile(asset), /likely a CORS issue/);
    }
    mocks.getBytes.mockRejectedValueOnce(new Error("permission denied"));
    await assert.rejects(libraryAssetToFile(asset), /permission denied/);
  });
});
