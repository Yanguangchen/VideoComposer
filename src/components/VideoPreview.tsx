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

  /* Player fills whatever the parent frame gives it; the parent controls sizing,
   * rounded corners and the border. That way the preview can scale up on wide
   * desktops without this component hard-capping the width. */
  return (
    <div className="h-full w-full bg-black">
      {mode === "single-image" ? (
        <Player
          key={`single-${singleImageProps.brandTitleFontId}-${singleImageProps.serviceFontId}-${singleImageProps.textSizeScale}-${singleImageProps.logoOffsetXPx}-${singleImageProps.logoOffsetYPx}`}
          component={SingleImageTemplate}
          inputProps={singleImageProps}
          durationInFrames={singleImageProps.durationInFrames}
          {...playerCommon}
        />
      ) : mode === "carousel" ? (
        <Player
          key={`carousel-${carouselProps.brandTitleFontId}-${carouselProps.serviceFontId}-${carouselProps.textSizeScale}-${carouselProps.logoOffsetXPx}-${carouselProps.logoOffsetYPx}`}
          component={CarouselTemplate}
          inputProps={carouselProps}
          durationInFrames={carouselDuration}
          {...playerCommon}
        />
      ) : (
        <Player
          key={`ba-${beforeAfterProps.brandTitleFontId}-${beforeAfterProps.serviceFontId}-${beforeAfterProps.textSizeScale}-${beforeAfterProps.logoOffsetXPx}-${beforeAfterProps.logoOffsetYPx}`}
          component={BeforeAfterTemplate}
          inputProps={beforeAfterProps}
          durationInFrames={beforeAfterProps.durationInFrames}
          {...playerCommon}
        />
      )}
    </div>
  );
}
