"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import type { RemotionCompositionId } from "@/remotion/composition-ids";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";
import { parseRenderErrorResponse } from "@/lib/render-client";
import { isDirectorySaveSupported, saveVideoToFolder } from "@/lib/save-to-directory";

type GetInputProps = () => Promise<
  BeforeAfterTemplateProps | SingleImageTemplateProps | CarouselTemplateProps
>;

export type RenderState = {
  isRendering: boolean;
  progress: number;
  phaseLabel: string;
  lastError: string | null;
  /** True once a render has completed and a video is available to download. */
  hasVideo: boolean;
};

export type UseRender = RenderState & {
  start: () => Promise<void>;
  /** Re-download the most recently rendered video without re-rendering. */
  download: () => void;
  /**
   * Write the most recent render into a folder the user picks (remembered for
   * next time). Resolves with the folder name, or null if no video exists.
   * Rejects if the browser is unsupported or the user denies access.
   */
  saveToFolder: () => Promise<string | null>;
  /** True when this browser supports writing straight into a chosen folder. */
  canSaveToFolder: boolean;
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
export function useRender({ compositionId, getInputProps, onBusyChange }: Params): UseRender {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Holds the most recent render so it can be downloaded again or written to a
  // folder without re-rendering. The object URL is revoked when replaced or on
  // unmount; the blob is kept for File System Access writes.
  const lastVideoRef = useRef<{ url: string; fileName: string; blob: Blob } | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const revokeLastVideo = useCallback(() => {
    if (lastVideoRef.current) {
      URL.revokeObjectURL(lastVideoRef.current.url);
      lastVideoRef.current = null;
    }
  }, []);

  const triggerDownload = useCallback((url: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  }, []);

  useEffect(
    () => () => {
      stopPolling();
      revokeLastVideo();
    },
    [stopPolling, revokeLastVideo],
  );

  const clearError = useCallback(() => setLastError(null), []);

  const download = useCallback(() => {
    if (!lastVideoRef.current) return;
    triggerDownload(lastVideoRef.current.url, lastVideoRef.current.fileName);
  }, [triggerDownload]);

  const saveToFolder = useCallback(async (): Promise<string | null> => {
    if (!lastVideoRef.current) return null;
    const { fileName, blob } = lastVideoRef.current;
    return saveVideoToFolder(fileName, blob);
  }, []);

  const start = useCallback(async () => {
    setLastError(null);
    setProgress(0);
    setPhaseLabel("Connecting…");
    setIsRendering(true);
    setHasVideo(false);
    revokeLastVideo();
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

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const base =
        compositionId === "SingleImage"
          ? "single"
          : compositionId === "Carousel"
            ? "carousel"
            : "before-after";
      const fileName = `${base}-${inputProps.brandId}.mp4`;
      // Retain the video so the Download / Save-to-folder buttons can reuse it
      // without a re-render; the URL is revoked when the next render starts or
      // on unmount.
      lastVideoRef.current = { url, fileName, blob };
      setHasVideo(true);
      triggerDownload(url, fileName);
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
  }, [compositionId, getInputProps, onBusyChange, stopPolling, revokeLastVideo, triggerDownload]);

  return {
    isRendering,
    progress,
    phaseLabel,
    lastError,
    hasVideo,
    start,
    download,
    saveToFolder,
    canSaveToFolder: isDirectorySaveSupported(),
    clearError,
  };
}
