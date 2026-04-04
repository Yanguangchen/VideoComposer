"use client";

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

const playerCommon = {
  compositionWidth: 1080,
  compositionHeight: 1920,
  fps: 30,
  style: { width: "100%", height: "100%" } as const,
  controls: true,
  clickToPlay: false,
  acknowledgeRemotionLicense: true as const,
};

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
  const carouselDuration = getEffectiveCarouselDurationInFrames(
    carouselProps.durationInFrames,
    carouselProps.slides.length,
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-inner">
      <div
        className="mx-auto w-full max-w-[360px]"
        style={{ aspectRatio: "1080 / 1920" }}
      >
        {mode === "single-image" ? (
          <Player
            component={SingleImageTemplate}
            inputProps={singleImageProps}
            durationInFrames={singleImageProps.durationInFrames}
            {...playerCommon}
          />
        ) : mode === "carousel" ? (
          <Player
            component={CarouselTemplate}
            inputProps={carouselProps}
            durationInFrames={carouselDuration}
            {...playerCommon}
          />
        ) : (
          <Player
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
