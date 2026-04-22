"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from "firebase/storage";
import { getDb, getStorageBucket } from "@/lib/firebase";

export type LibraryAsset = {
  id: string;
  brandId: string;
  storagePath: string;
  downloadUrl: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: number | null;
};

export type UploadProgress = {
  filename: string;
  /** 0..1 for in-progress uploads, 1 when the Firestore doc is written. */
  ratio: number;
  status: "uploading" | "finalizing" | "done" | "error";
  error?: string;
};

const MEDIA_COLLECTION = "media";

/**
 * Real-time subscription to every media asset for a brand.
 *
 * The listener stays open until the returned unsubscribe function is called.
 * Results are ordered newest-first so the uploader shows what you just added.
 */
export function subscribeLibraryMedia(
  brandId: string,
  onNext: (assets: LibraryAsset[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const db = getDb();
  const q = query(
    collection(db, MEDIA_COLLECTION),
    where("brandId", "==", brandId),
    orderBy("uploadedAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const assets: LibraryAsset[] = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.uploadedAt as Timestamp | null;
        return {
          id: d.id,
          brandId: data.brandId as string,
          storagePath: data.storagePath as string,
          downloadUrl: data.downloadUrl as string,
          filename: (data.filename as string) ?? "untitled",
          contentType: (data.contentType as string) ?? "application/octet-stream",
          sizeBytes: (data.sizeBytes as number) ?? 0,
          uploadedAt: ts ? ts.toMillis() : null,
        };
      });
      onNext(assets);
    },
    (err) => onError?.(err),
  );
}

function extForContentType(type: string, fallbackName: string): string {
  if (type.startsWith("image/")) {
    const simple = type.slice(6).split(";")[0]?.trim();
    if (simple === "jpeg") return "jpg";
    if (simple && /^[a-z0-9]+$/.test(simple)) return simple;
  }
  const dot = fallbackName.lastIndexOf(".");
  if (dot >= 0 && dot < fallbackName.length - 1) {
    const ext = fallbackName.slice(dot + 1).toLowerCase();
    if (/^[a-z0-9]+$/.test(ext)) return ext;
  }
  return "bin";
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Upload one or more files to a brand's library.
 *
 * `onProgress` fires per file as bytes transfer and again when the Firestore
 * metadata row is written (`status: "done"`). Uploads run in parallel.
 */
export async function uploadLibraryMedia(
  brandId: string,
  files: File[],
  onProgress?: (update: UploadProgress) => void,
): Promise<LibraryAsset[]> {
  if (!files.length) return [];
  const db = getDb();
  const bucket = getStorageBucket();

  const jobs = files.map(
    (file) =>
      new Promise<LibraryAsset>((resolve, reject) => {
        const id = randomId();
        const ext = extForContentType(file.type, file.name);
        const path = `brands/${brandId}/${id}.${ext}`;
        const objectRef = storageRef(bucket, path);
        const task = uploadBytesResumable(objectRef, file, {
          contentType: file.type || "application/octet-stream",
        });
        task.on(
          "state_changed",
          (snap) => {
            const ratio = snap.totalBytes
              ? snap.bytesTransferred / snap.totalBytes
              : 0;
            onProgress?.({
              filename: file.name,
              ratio: Math.min(0.99, ratio),
              status: "uploading",
            });
          },
          (err) => {
            onProgress?.({
              filename: file.name,
              ratio: 0,
              status: "error",
              error: err.message,
            });
            reject(err);
          },
          async () => {
            try {
              onProgress?.({
                filename: file.name,
                ratio: 0.99,
                status: "finalizing",
              });
              const downloadUrl = await getDownloadURL(task.snapshot.ref);
              const docRef = await addDoc(collection(db, MEDIA_COLLECTION), {
                brandId,
                storagePath: path,
                downloadUrl,
                filename: file.name,
                contentType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                uploadedAt: serverTimestamp(),
              });
              onProgress?.({
                filename: file.name,
                ratio: 1,
                status: "done",
              });
              resolve({
                id: docRef.id,
                brandId,
                storagePath: path,
                downloadUrl,
                filename: file.name,
                contentType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                uploadedAt: Date.now(),
              });
            } catch (err) {
              const message =
                err instanceof Error ? err.message : String(err);
              onProgress?.({
                filename: file.name,
                ratio: 0.99,
                status: "error",
                error: message,
              });
              reject(err);
            }
          },
        );
      }),
  );

  const results = await Promise.allSettled(jobs);
  return results
    .filter(
      (r): r is PromiseFulfilledResult<LibraryAsset> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}

/** Remove both the Storage object and the Firestore doc. */
export async function deleteLibraryAsset(asset: LibraryAsset): Promise<void> {
  const db = getDb();
  const bucket = getStorageBucket();
  // Delete the object first; if Storage fails we keep the metadata so the user
  // can retry, but if Firestore fails after Storage succeeds the next upload
  // would leak a pointer-less file — delete the doc last to minimize the window.
  await deleteObject(storageRef(bucket, asset.storagePath)).catch((err) => {
    // Storage "not found" means the file is already gone — still drop the doc.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "storage/object-not-found"
    ) {
      return;
    }
    throw err;
  });
  await deleteDoc(doc(db, MEDIA_COLLECTION, asset.id));
}

/**
 * Fetch an asset's bytes and wrap them as a `File` so it can feed the
 * existing upload pipeline (`MediaUploader.onFile`, `fileToDataUrl`, …).
 */
export async function libraryAssetToFile(asset: LibraryAsset): Promise<File> {
  const res = await fetch(asset.downloadUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to download ${asset.filename} (${res.status} ${res.statusText})`,
    );
  }
  const blob = await res.blob();
  return new File([blob], asset.filename, {
    type: blob.type || asset.contentType,
  });
}
