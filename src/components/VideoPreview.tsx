"use client";

import { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import { BeforeAfterTemplate } from "@/remotion/before-after-template";
import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { TemplateModeId } from "@/config/template-modes";
import {
  getEffectiveCarouselDurationInFrames,
  CarouselTemplate,
} from "@/remotion/carousel-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import { SingleImageTemplate } from "@/remotion/single-image-template";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";

function useMobilePlaybackGesture(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return narrow;
}

type Props = {
  mode: TemplateModeId;
  beforeAfterProps: BeforeAfterTemplateProps;
  singleImageProps: SingleImageTemplateProps;
  carouselProps: CarouselTemplateProps;
};

export function VideoPreview({
  mode,
  beforeAfterProps,
  singleImageProps,
  carouselProps,
}: Props) {
  const clickToPlay = useMobilePlaybackGesture();
  const carouselDuration = getEffectiveCarouselDurationInFrames(
    carouselProps.durationInFrames,
    carouselProps.slides.length,
  );

  const playerCommon = {
    compositionWidth: 1080,
    compositionHeight: 1920,
    fps: 30,
    style: { width: "100%", height: "100%" } as const,
    controls: true,
    /** Mobile Safari / Brave often block autoplay; require a tap to start. */
    clickToPlay,
    acknowledgeRemotionLicense: true as const,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-inner dark:border-slate-700">
      <div
        className="mx-auto w-full max-w-[360px]"
        style={{ aspectRatio: "1080 / 1920" }}
      >
        {mode === "single-image" ? (
          <Player
            key={`single-${singleImageProps.brandTitleFontId}-${singleImageProps.serviceFontId}`}
            component={SingleImageTemplate}
            inputProps={singleImageProps}
            durationInFrames={singleImageProps.durationInFrames}
            {...playerCommon}
          />
        ) : mode === "carousel" ? (
          <Player
            key={`carousel-${carouselProps.brandTitleFontId}-${carouselProps.serviceFontId}`}
            component={CarouselTemplate}
            inputProps={carouselProps}
            durationInFrames={carouselDuration}
            {...playerCommon}
          />
        ) : (
          <Player
            key={`ba-${beforeAfterProps.brandTitleFontId}-${beforeAfterProps.serviceFontId}`}
            component={BeforeAfterTemplate}
            inputProps={beforeAfterProps}
            durationInFrames={beforeAfterProps.durationInFrames}
            {...playerCommon}
          />
        )}
      </div>
    </div>
  );
}
