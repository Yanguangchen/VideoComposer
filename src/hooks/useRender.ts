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
};

/**
 * Extracted from the original RenderAndDownload component — the HTTP/polling
 * behavior is byte-for-byte the same; only UI shells differ between the
 * legacy card and the new ExportBar.
 */
export function useRender({
  compositionId,
  getInputProps,
  onBusyChange,
}: Params): UseRender {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
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
      setIsRendering(false);
      onBusyChange?.(false);
    }
  }, [compositionId, getInputProps, onBusyChange, stopPolling]);

  return {
    isRendering,
    progress,
    phaseLabel,
    lastError,
    start,
    clearError,
  };
}
