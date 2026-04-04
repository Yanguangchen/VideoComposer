import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { isServiceFontId } from "@/config/service-fonts";
import { clampDurationFrames } from "@/config/video-duration";
import {
  DEFAULT_CAPTION_COLOR_HEX,
  normalizeHexColor,
} from "@/lib/hex-color";
import { BackgroundLayer } from "@/remotion/background-layer";
import { resolveMediaSrc } from "@/remotion/media-utils";
import { PriceTagBadge } from "@/remotion/price-tag-badge";
import {
  preloadAllServiceFonts,
  SERVICE_FONT_CSS,
} from "@/remotion/service-font-loaders";

/** Time each slide is visible (30 fps → 1.5s per slide). */
export const CAROUSEL_FRAMES_PER_SLIDE = 45;

export function getCarouselDurationInFrames(slideCount: number): number {
  return Math.max(1, slideCount) * CAROUSEL_FRAMES_PER_SLIDE;
}

/** Preview / Player: user duration cannot be shorter than all slides. */
export function getEffectiveCarouselDurationInFrames(
  durationInFrames: number,
  slideCount: number,
): number {
  const required = getCarouselDurationInFrames(Math.max(1, slideCount));
  return Math.max(clampDurationFrames(durationInFrames), required);
}

export type CarouselSlide = {
  imageSrc: string;
  /** Caption shown with this slide. */
  title: string;
};

export type CarouselTemplateProps = {
  brandId: string;
  titleText: string;
  /** Optional line below each slide’s image block (smaller type). */
  subtitleText: string;
  showPriceTag: boolean;
  priceTagText: string;
  bgSrc: string;
  musicSrc: string;
  logoSrc: string;
  showLogo: boolean;
  headlineColorHex: string;
  captionColorHex: string;
  slides: CarouselSlide[];
  brandTitleFontId: string;
  serviceFontId: string;
  /** Total composition length; carousel bumps up to fit every slide. */
  durationInFrames: number;
};

type SlideCardProps = {
  slide: CarouselSlide;
  serviceFontResolved: string;
  serviceFontWeight: number;
  logoSrc: string;
  showLogo: boolean;
  captionColor: string;
  subtitleText: string;
  showPriceTag: boolean;
  priceTagText: string;
  brandTitleResolved: string;
  brandTitleFontId: string;
  headlineColor: string;
};

const SlideCard: FC<SlideCardProps> = ({
  slide,
  serviceFontResolved,
  serviceFontWeight,
  logoSrc,
  showLogo,
  captionColor,
  subtitleText,
  showPriceTag,
  priceTagText,
  brandTitleResolved,
  brandTitleFontId,
  headlineColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.96, 1.04],
  );
  const fade = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          paddingTop: 160,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "86%",
            maxWidth: 960,
            backgroundColor: "rgba(255,255,255,0.18)",
            borderRadius: 28,
            padding: 20,
            backdropFilter: "blur(10px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          }}
        >
          <Img
            src={resolveMediaSrc(slide.imageSrc)}
            style={{
              width: "100%",
              height: 780,
              objectFit: "cover",
              borderRadius: 20,
            }}
          />

          {subtitleText.trim() ||
          (showPriceTag && priceTagText.trim()) ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                marginTop: 20,
                width: "100%",
              }}
            >
              {subtitleText.trim() ? (
                <div
                  style={{
                    fontFamily: brandTitleResolved,
                    color: headlineColor,
                    fontSize: 34,
                    fontWeight: brandTitleFontId === "bebas-neue" ? 400 : 600,
                    textAlign: "center",
                    textShadow: "0 2px 16px rgba(0,0,0,0.4)",
                    lineHeight: 1.25,
                    opacity: 0.92,
                    width: "100%",
                  }}
                >
                  {subtitleText.trim()}
                </div>
              ) : null}
              <PriceTagBadge
                showPriceTag={showPriceTag}
                priceTagText={priceTagText}
                fontFamily={brandTitleResolved}
                color={headlineColor}
                fontSize={30}
                brandTitleFontId={brandTitleFontId}
              />
            </div>
          ) : null}

          {slide.title.trim() ? (
            <div
              style={{
                fontFamily: serviceFontResolved,
                color: captionColor,
                fontSize: 36,
                fontWeight: serviceFontWeight,
                textAlign: "center",
                marginTop: 20,
                lineHeight: 1.2,
                textShadow: "0 4px 20px rgba(0,0,0,0.55)",
              }}
            >
              {slide.title.trim()}
            </div>
          ) : null}

          {showLogo && logoSrc ? (
            <div
              style={{
                position: "absolute",
                right: -72,
                bottom: 36,
                transform: `scale(${pulse})`,
              }}
            >
              <Img
                src={resolveMediaSrc(logoSrc)}
                style={{
                  width: 280,
                  height: 280,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "8px solid white",
                  boxShadow: "0 24px 56px rgba(0,0,0,0.55)",
                  backgroundColor: "white",
                }}
              />
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CarouselTemplate: FC<CarouselTemplateProps> = ({
  titleText,
  subtitleText,
  showPriceTag,
  priceTagText,
  bgSrc,
  musicSrc,
  logoSrc,
  showLogo,
  headlineColorHex,
  captionColorHex,
  slides,
  brandTitleFontId,
  serviceFontId,
}) => {
  const [fontBlock] = useState(() => delayRender());
  const { durationInFrames: compositionDuration } = useVideoConfig();

  useEffect(() => {
    preloadAllServiceFonts()
      .then(() => continueRender(fontBlock))
      .catch(() => continueRender(fontBlock));
  }, [fontBlock]);

  const brandTitleResolved = isServiceFontId(brandTitleFontId)
    ? SERVICE_FONT_CSS[brandTitleFontId]
    : SERVICE_FONT_CSS.inter;
  const brandTitleWeight =
    brandTitleFontId === "bebas-neue" ? 400 : 800;

  const serviceFontResolved = isServiceFontId(serviceFontId)
    ? SERVICE_FONT_CSS[serviceFontId]
    : SERVICE_FONT_CSS.inter;
  const serviceFontWeight =
    serviceFontId === "bebas-neue" ? 400 : 700;

  const headlineColor = normalizeHexColor(headlineColorHex, "#ffffff");
  const captionColor = normalizeHexColor(
    captionColorHex,
    DEFAULT_CAPTION_COLOR_HEX,
  );

  const safeSlides = slides.length > 0 ? slides : [{ imageSrc: "", title: "" }];
  const slideCount = safeSlides.length;
  const requiredFrames = slideCount * CAROUSEL_FRAMES_PER_SLIDE;
  const extraFrames = Math.max(0, compositionDuration - requiredFrames);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {musicSrc ? (
        <Audio
          src={resolveMediaSrc(musicSrc)}
          volume={0.22}
          loop
        />
      ) : null}
      {bgSrc ? (
        <BackgroundLayer bgSrc={bgSrc} />
      ) : (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(160deg, #0f172a 0%, #1e3a5f 45%, #312e81 100%)",
          }}
        />
      )}

      <AbsoluteFill style={{ zIndex: 1 }}>
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingLeft: 40,
            paddingRight: 40,
          }}
        >
          <div
            style={{
              fontFamily: brandTitleResolved,
              color: headlineColor,
              fontSize: 48,
              fontWeight: brandTitleWeight,
              textAlign: "center",
              textShadow: "0 4px 24px rgba(0,0,0,0.45)",
              lineHeight: 1.15,
              width: "100%",
            }}
          >
            {titleText}
          </div>
        </div>

        {safeSlides.map((slide, index) => {
          const from = index * CAROUSEL_FRAMES_PER_SLIDE;
          const isLast = index === slideCount - 1;
          const segmentFrames = isLast
            ? CAROUSEL_FRAMES_PER_SLIDE + extraFrames
            : CAROUSEL_FRAMES_PER_SLIDE;
          return (
            <Sequence
              key={index}
              from={from}
              durationInFrames={segmentFrames}
            >
              <SlideCard
                slide={slide}
                serviceFontResolved={serviceFontResolved}
                serviceFontWeight={serviceFontWeight}
                logoSrc={logoSrc}
                showLogo={showLogo}
                captionColor={captionColor}
                subtitleText={subtitleText}
                showPriceTag={showPriceTag}
                priceTagText={priceTagText}
                brandTitleResolved={brandTitleResolved}
                brandTitleFontId={brandTitleFontId}
                headlineColor={headlineColor}
              />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
