"use client";

import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import type { RemotionCompositionId } from "@/remotion/composition-ids";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";

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
  async function handleExport() {
    onBusyChange(true);
    try {
      const inputProps = await getInputProps();
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionId, inputProps }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Render failed");
      }
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
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || isRendering}
      onClick={() => {
        void handleExport().catch((e) => {
          console.error(e);
          alert(e instanceof Error ? e.message : "Export failed");
        });
      }}
      className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isRendering ? "Rendering…" : "Export MP4"}
    </button>
  );
}
