"use client";

/**
 * Saves a rendered video straight into a folder on the user's disk using the
 * File System Access API (Chromium browsers).
 *
 * The browser will not let a web page write to a hard-coded path — the user has
 * to grant access by picking the folder once. After that we persist the folder
 * handle in IndexedDB, so subsequent saves go to the same place with (at most) a
 * one-click permission re-grant. This is the closest the web platform allows to
 * a "save to my tmp folder" button.
 */

const DB_NAME = "video-composer-fs";
const DB_VERSION = 1;
const STORE = "handles";
const DIR_KEY = "output-dir";

type WritePermissionOptions = { mode: "readwrite" };
type PermissionResult = "granted" | "denied" | "prompt";

/** File System Access permission methods are not in every TS DOM lib yet. */
type PermissionCapableHandle = {
  queryPermission(opts: WritePermissionOptions): Promise<PermissionResult>;
  requestPermission(opts: WritePermissionOptions): Promise<PermissionResult>;
};

type DirectoryPickerOptions = {
  id?: string;
  mode?: "read" | "readwrite";
  startIn?: "documents" | "downloads" | "desktop" | "music" | "pictures" | "videos";
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (opts?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
};

/** True when this browser can write files into a user-chosen folder. */
export function isDirectorySaveSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function" &&
    typeof indexedDB !== "undefined"
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result as T);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

/** The folder chosen on a previous save, if any (and still stored). */
export async function loadSavedDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isDirectorySaveSupported()) return null;
  try {
    const handle = await withStore<FileSystemDirectoryHandle | undefined>("readonly", (s) =>
      s.get(DIR_KEY),
    );
    return handle ?? null;
  } catch {
    return null;
  }
}

async function storeDirectory(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.put(handle, DIR_KEY));
  } catch {
    /* best-effort — a lost handle just means we prompt again next time */
  }
}

/** Prompt the user to choose an output folder and remember it. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("This browser can't save directly to a folder.");
  const handle = await picker({ id: "video-output", mode: "readwrite", startIn: "documents" });
  await storeDirectory(handle);
  return handle;
}

async function ensureWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const permHandle = handle as unknown as PermissionCapableHandle;
  const opts: WritePermissionOptions = { mode: "readwrite" };
  try {
    if ((await permHandle.queryPermission(opts)) === "granted") return true;
    return (await permHandle.requestPermission(opts)) === "granted";
  } catch {
    // Older implementations may lack the permission methods; assume writable.
    return true;
  }
}

async function writeBlob(
  dir: FileSystemDirectoryHandle,
  fileName: string,
  blob: Blob,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
}

export class DirectoryPermissionError extends Error {}

/**
 * Write `blob` as `fileName` into the user's saved folder, prompting them to
 * pick one the first time (or if the saved permission was revoked). Returns the
 * folder name that was written to.
 */
export async function saveVideoToFolder(fileName: string, blob: Blob): Promise<string> {
  if (!isDirectorySaveSupported()) {
    throw new Error("This browser can't save directly to a folder. Try Chrome or Edge.");
  }

  let handle = await loadSavedDirectory();
  let permitted = handle ? await ensureWritePermission(handle) : false;

  if (!handle || !permitted) {
    handle = await pickDirectory();
    permitted = await ensureWritePermission(handle);
    if (!permitted) {
      throw new DirectoryPermissionError("Permission to write to the folder was denied.");
    }
  }

  await writeBlob(handle, fileName, blob);
  return handle.name;
}
