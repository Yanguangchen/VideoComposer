"use client";

import { useEffect, useState } from "react";
import type { Brand } from "@/config/brands";
import { brandLogoPublicUrl } from "@/config/brands";
import {
  LOGO_STORAGE_PREFIX,
  pickDefaultLogoFile,
} from "@/lib/brand-logos";

type Props = {
  brand: Brand;
  value: string | null;
  onChange: (filename: string | null) => void;
};

export function LogoPicker({ brand, value, onChange }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/brand-logos/${encodeURIComponent(brand.id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not list logos");
        return res.json() as Promise<{ files: string[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setFiles(data.files);
        const storageKey = `${LOGO_STORAGE_PREFIX}${brand.id}`;
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem(storageKey)
            : null;
        const defaultFile = pickDefaultLogoFile(data.files);
        const next =
          stored && data.files.includes(stored) ? stored : defaultFile;
        onChange(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load logos");
          onChange(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally only re-fetch when brand changes; onChange is parent setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onChange is stable (setState)
  }, [brand.id]);

  function handleSelect(filename: string) {
    onChange(filename || null);
    if (filename && typeof window !== "undefined") {
      window.localStorage.setItem(
        `${LOGO_STORAGE_PREFIX}${brand.id}`,
        filename,
      );
    }
  }

  const previewUrl =
    value && files.includes(value) ? brandLogoPublicUrl(brand, value) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Brand logo
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Files live in{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800 dark:text-slate-300">
          public/{brand.logoFolder}/
        </code>{" "}
        — add PNG/SVG/JPG here; selection is remembered per brand in this
        browser.
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Loading logos…
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : files.length === 0 ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400/90">
          No logo files found. Add images to{" "}
          <code className="rounded bg-amber-50 px-1 dark:bg-amber-950/50 dark:text-amber-200">
            public/{brand.logoFolder}/
          </code>
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-medium">Select file</span>
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              value={value ?? ""}
              onChange={(e) => handleSelect(e.target.value)}
            >
              {files.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Logo preview"
              className="h-32 w-32 shrink-0 rounded-full border-2 border-slate-200 bg-white object-cover dark:border-slate-600 dark:bg-slate-800"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
