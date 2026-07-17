"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import type { RemotionCompositionId } from "@/remotion/composition-ids";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";
import { parseRenderErrorResponse } from "@/lib/render-client";

type GetInputProps = () => Promise<
  BeforeAfterTemplateProps | SingleImageTemplateProps | CarouselTemplateProps
>;

export type RenderState = {
  isRendering: boolean;
  progress: number;
  phaseLabel: string;
  lastError: string | null;
};

export type UseRender = RenderState & {
  start: () => Promise<void>;
  clearError: () => void;
};

type Params = {
  compositionId: RemotionCompositionId;
  getInputProps: GetInputProps;
  onBusyChange?: (busy: boolean) => void;
  /**
   * Current AI caption, if any. When present, a single export downloads both
   * the rendered `video.mp4` and a matching `caption.txt` — one click yields
   * both files (used for RPA pickup in the browser's download folder).
   */
  getCaption?: () => string;
};

function baseFileName(compositionId: RemotionCompositionId): string {
  if (compositionId === "SingleImage") return "single";
  if (compositionId === "Carousel") return "carousel";
  return "before-after";
}

/**
 * Extracted from the original RenderAndDownload component — the HTTP/polling
 * behavior is byte-for-byte the same; only UI shells differ between the
 * legacy card and the new ExportBar.
 */
export function useRender({
  compositionId,
  getInputProps,
  onBusyChange,
  getCaption,
}: Params): UseRender {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Read the latest caption at export time without re-creating `start`.
  const getCaptionRef = useRef(getCaption);
  getCaptionRef.current = getCaption;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const downloadBlob = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const clearError = useCallback(() => setLastError(null), []);

  const start = useCallback(async () => {
    setLastError(null);
    setProgress(0);
    setPhaseLabel("Connecting…");
    setIsRendering(true);
    onBusyChange?.(true);

    const sessionId = crypto.randomUUID();

    const pollOnce = async () => {
      try {
        const r = await fetch(`/api/render/progress?sessionId=${encodeURIComponent(sessionId)}`);
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
        /* ignore transient poll failures */
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

      const base = baseFileName(compositionId);
      const stem = `${base}-${inputProps.brandId}`;

      // 1) Download the rendered video.
      const videoBlob = await res.blob();
      downloadBlob(videoBlob, `${stem}.mp4`);

      // 2) Download the matching caption as a .txt (same stem for easy RPA
      //    pairing), when a caption has been generated.
      const caption = getCaptionRef.current?.().trim() ?? "";
      if (caption) {
        const captionBlob = new Blob([caption], { type: "text/plain;charset=utf-8" });
        downloadBlob(captionBlob, `${stem}.txt`);
      }
    } catch (e) {
      stopPolling();
      const msg =
        e instanceof Error ? e.message : "Export failed. Check your connection and try again.";
      setLastError(msg);
    } finally {
      stopPolling();
      setProgress(0);
      setPhaseLabel("");
      setIsRendering(false);
      onBusyChange?.(false);
    }
  }, [compositionId, getInputProps, onBusyChange, stopPolling, downloadBlob]);

  return {
    isRendering,
    progress,
    phaseLabel,
    lastError,
    start,
    clearError,
  };
}
