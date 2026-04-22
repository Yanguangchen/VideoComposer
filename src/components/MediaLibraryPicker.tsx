"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type LibraryAsset,
  libraryAssetToFile,
  subscribeLibraryMedia,
} from "@/lib/media-library";

type Props = {
  open: boolean;
  brandId: string;
  brandLabel: string;
  /** How many files the caller wants. 1 = replaces current selection. */
  maxSelection: number;
  onClose: () => void;
  onApply: (files: File[]) => void;
};

export function MediaLibraryPicker({
  open,
  brandId,
  brandLabel,
  maxSelection,
  onClose,
  onApply,
}: Props) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setLoadError(null);
    setSelectedIds([]);
    setApplyError(null);
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
  }, [brandId, open]);

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => assets.find((a) => a.id === id))
        .filter((a): a is LibraryAsset => Boolean(a)),
    [assets, selectedIds],
  );

  function toggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (maxSelection === 1) return [id];
      if (prev.length >= maxSelection) return prev;
      return [...prev, id];
    });
  }

  async function handleApply() {
    if (!selected.length) return;
    setApplying(true);
    setApplyError(null);
    try {
      const files = await Promise.all(selected.map(libraryAssetToFile));
      onApply(files);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Pick from library
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {brandLabel}
              {maxSelection > 1 ? ` · up to ${maxSelection} images` : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading…
            </p>
          ) : assets.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No assets yet. Upload photos to this brand&apos;s library first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {assets.map((asset) => {
                const isSelected = selectedIds.includes(asset.id);
                const order = isSelected
                  ? selectedIds.indexOf(asset.id) + 1
                  : null;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggle(asset.id)}
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-300"
                        : "border-slate-200 hover:border-blue-400 dark:border-slate-700"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.downloadUrl}
                      alt={asset.filename}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {order !== null ? (
                      <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {maxSelection > 1 ? order : "✓"}
                      </span>
                    ) : null}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-left text-[10px] text-white">
                      {asset.filename}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex-1 text-xs text-slate-500 dark:text-slate-400">
            {applyError ? (
              <span className="text-red-600 dark:text-red-400">{applyError}</span>
            ) : selected.length > 0 ? (
              <>
                {selected.length} selected
                {maxSelection > 1 ? ` / ${maxSelection}` : ""}
              </>
            ) : (
              "Select one or more images"
            )}
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || selected.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? "Preparing…" : "Use selection"}
          </button>
        </div>
      </div>
    </div>
  );
}
