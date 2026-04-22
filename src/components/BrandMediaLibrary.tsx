"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  deleteLibraryAsset,
  type LibraryAsset,
  subscribeLibraryMedia,
  uploadLibraryMedia,
  type UploadProgress,
} from "@/lib/media-library";

type Props = {
  brandId: string;
  brandLabel: string;
};

type PendingProgress = {
  filename: string;
  ratio: number;
  status: UploadProgress["status"];
  error?: string;
};

export function BrandMediaLibrary({ brandId, brandLabel }: Props) {
  const configured = isFirebaseConfigured();
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, PendingProgress>>({});
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    let active = true;
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeLibraryMedia(
        brandId,
        (next) => {
          if (!active) return;
          setAssets(next);
          setLoading(false);
        },
        (err) => {
          if (!active) return;
          setLoadError(err.message);
          setLoading(false);
        },
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [brandId, configured]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      setUploading(true);
      setPending((prev) => {
        const next = { ...prev };
        accepted.forEach((f) => {
          next[f.name] = {
            filename: f.name,
            ratio: 0,
            status: "uploading",
          };
        });
        return next;
      });
      try {
        await uploadLibraryMedia(brandId, accepted, (update) => {
          setPending((prev) => ({ ...prev, [update.filename]: update }));
        });
      } finally {
        setUploading(false);
        // Keep error lines visible; clear only the successful ones.
        setPending((prev) => {
          const next: Record<string, PendingProgress> = {};
          for (const [k, v] of Object.entries(prev)) {
            if (v.status !== "done") next[k] = v;
          }
          return next;
        });
      }
    },
    [brandId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    multiple: true,
    useFsAccessApi: false,
  });

  const pendingList = useMemo(() => Object.values(pending), [pending]);

  async function handleDelete(asset: LibraryAsset) {
    if (!confirm(`Delete ${asset.filename} from ${brandLabel}?`)) return;
    setDeletingId(asset.id);
    try {
      await deleteLibraryAsset(asset);
    } catch (err) {
      alert(
        `Failed to delete: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-semibold">Firebase not configured</p>
        <p className="mt-1 text-xs">
          Set the <code>NEXT_PUBLIC_FIREBASE_*</code> env vars in{" "}
          <code>.env.local</code> to enable the shared media library. See{" "}
          <code>docs/media-library-setup.md</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Shared library for <span className="font-semibold">{brandLabel}</span>
          . Drop photos here to bulk-upload, then pick them into any step.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`touch-manipulation flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors ${
          isDragActive
            ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/30"
            : "border-slate-300 bg-white hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:border-emerald-500"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-center text-sm font-medium text-slate-700 dark:text-slate-200">
          Drop photos to upload
        </p>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Multiple files supported · saved under{" "}
          <code>brands/{brandId}/…</code>
        </p>
      </div>

      {pendingList.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-xs">
          {pendingList.map((p) => (
            <li
              key={p.filename}
              className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
            >
              <span className="flex-1 truncate text-slate-700 dark:text-slate-200">
                {p.filename}
              </span>
              <span
                className={
                  p.status === "error"
                    ? "text-red-600 dark:text-red-400"
                    : p.status === "done"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400"
                }
              >
                {p.status === "error"
                  ? (p.error ?? "failed")
                  : p.status === "done"
                    ? "done"
                    : p.status === "finalizing"
                      ? "finalizing…"
                      : `${Math.round(p.ratio * 100)}%`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {loadError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      ) : loading ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Loading library…
        </p>
      ) : assets.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No assets yet. Upload a batch above to get started.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.downloadUrl}
                alt={asset.filename}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => handleDelete(asset)}
                disabled={deletingId === asset.id}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                aria-label={`Delete ${asset.filename}`}
              >
                {deletingId === asset.id ? "…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Uploads in progress — you can continue editing; they&apos;ll appear
          above when ready.
        </p>
      ) : null}
    </div>
  );
}
