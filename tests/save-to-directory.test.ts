// @vitest-environment jsdom

import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, vi } from "vitest";

import {
  DirectoryPermissionError,
  isDirectorySaveSupported,
  saveVideoToFolder,
} from "../src/lib/save-to-directory";

type Perm = "granted" | "denied" | "prompt";

function makeDir(name: string, permission: Perm = "granted") {
  const writes: { fileName: string; chunks: unknown[] }[] = [];
  const handle = {
    name,
    kind: "directory" as const,
    queryPermission: vi.fn(async () => permission),
    requestPermission: vi.fn(async () => permission),
    getFileHandle: vi.fn(async (fileName: string) => {
      const record = { fileName, chunks: [] as unknown[] };
      writes.push(record);
      return {
        name: fileName,
        kind: "file" as const,
        createWritable: vi.fn(async () => ({
          write: vi.fn(async (chunk: unknown) => {
            record.chunks.push(chunk);
          }),
          close: vi.fn(async () => undefined),
        })),
      };
    }),
  };
  return { handle, writes };
}

const originalIndexedDB = globalThis.indexedDB;

beforeEach(async () => {
  // Fresh IndexedDB between tests so a saved handle doesn't leak across cases.
  const { IDBFactory } = await import("fake-indexeddb");
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  globalThis.indexedDB = originalIndexedDB;
  delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
  vi.restoreAllMocks();
});

describe("save-to-directory", () => {
  it("reports unsupported when the picker is missing", () => {
    assert.equal(isDirectorySaveSupported(), false);
  });

  it("prompts for a folder, writes the blob, and remembers it", async () => {
    const first = makeDir("tmp");
    const picker = vi.fn(async () => first.handle as unknown as FileSystemDirectoryHandle);
    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = picker;

    assert.equal(isDirectorySaveSupported(), true);

    const blob = new Blob(["video-bytes"], { type: "video/mp4" });
    const dirName = await saveVideoToFolder("single-brand.mp4", blob);

    assert.equal(dirName, "tmp");
    assert.equal(picker.mock.calls.length, 1);
    assert.equal(first.writes.length, 1);
    assert.equal(first.writes[0]!.fileName, "single-brand.mp4");
    assert.equal(first.writes[0]!.chunks[0], blob);
  });

  it("throws a permission error when write access is denied", async () => {
    const denied = makeDir("tmp", "denied");
    const picker = vi.fn(async () => denied.handle as unknown as FileSystemDirectoryHandle);
    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = picker;

    await assert.rejects(
      saveVideoToFolder("clip.mp4", new Blob(["x"])),
      (err: unknown) => err instanceof DirectoryPermissionError,
    );
    assert.equal(denied.writes.length, 0);
  });
});
