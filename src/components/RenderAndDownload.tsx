"use client";

import { useEffect, useRef, useState } from "react";
import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import type { RemotionCompositionId } from "@/remotion/composition-ids";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";
import { parseRenderErrorResponse } from "@/lib/render-client";

type Props = {
  disabled: boolean;
  isRendering: boolean;
  compositionId: RemotionCompositionId;
  getInputProps: () => Promise<
    BeforeAfterTemplateProps | SingleImageTemplateProps | CarouselTemplateProps
  >;
  onBusyChange: (busy: boolean) => void;
};

export function RenderAndDownload({
  disabled,
  isRendering,
  compositionId,
  getInputProps,
  onBusyChange,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  async function handleExport() {
    setLastError(null);
    setProgress(0);
    setPhaseLabel("Connecting…");
    onBusyChange(true);

    const sessionId = crypto.randomUUID();

    const pollOnce = async () => {
      try {
        const r = await fetch(
          `/api/render/progress?sessionId=${encodeURIComponent(sessionId)}`,
        );
        if (!r.ok) return;
        const j = (await r.json()) as {
          progress?: number;
          label?: string;
          active?: boolean;
        };
        if (typeof j.progress === "number") {
          setProgress(Math.min(100, Math.max(0, j.progress)));
        }
        if (typeof j.label === "string") {
          setPhaseLabel(j.label);
        }
      } catch {
        // ignore transient poll failures
      }
    };

    pollRef.current = setInterval(pollOnce, 400);
    void pollOnce();

    try {
      const inputProps = await getInputProps();
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionId, inputProps, sessionId }),
      });

      stopPolling();

      if (!res.ok) {
        const msg = await parseRenderErrorResponse(res);
        throw new Error(msg);
      }

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("video") && !ct.includes("octet-stream")) {
        const msg = await parseRenderErrorResponse(res);
        throw new Error(msg);
      }

      setProgress(100);
      setPhaseLabel("Done");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base =
        compositionId === "SingleImage"
          ? "single"
          : compositionId === "Carousel"
            ? "carousel"
            : "before-after";
      a.download = `${base}-${inputProps.brandId}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      stopPolling();
      const msg =
        e instanceof Error
          ? e.message
          : "Export failed. Check your connection and try again.";
      setLastError(msg);
    } finally {
      stopPolling();
      setProgress(0);
      setPhaseLabel("");
      onBusyChange(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled || isRendering}
        onClick={() => {
          void handleExport();
        }}
        className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        {isRendering ? "Rendering…" : "Export MP4"}
      </button>

      <a
        href="https://wizards-dashboard.vercel.app/facebook.html"
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-center text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-700"
      >
        Go to Facebook Pages
      </a>

      {isRendering ? (
        <div className="space-y-1.5">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            role="group"
            aria-label="Render progress"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            {phaseLabel || "Working…"}
            {progress > 0 ? (
              <span className="text-slate-400 dark:text-slate-500"> · {progress}%</span>
            ) : null}
          </p>
        </div>
      ) : null}

      {lastError ? (
        <div
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm leading-snug text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          <p className="font-semibold text-red-950 dark:text-red-100">
            Could not export video
          </p>
          <p className="mt-1 whitespace-pre-wrap">{lastError}</p>
        </div>
      ) : null}
    </div>
  );
}
