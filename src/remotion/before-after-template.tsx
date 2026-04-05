import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { isServiceFontId } from "@/config/service-fonts";
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

export type BeforeAfterTemplateProps = {
  brandId: string;
  titleText: string;
  /** Optional line below the image block (smaller type). */
  subtitleText: string;
  /** When true, show `priceTagText` in a tag below the subtitle. */
  showPriceTag: boolean;
  priceTagText: string;
  topImageSrc: string;
  bottomImageSrc: string;
  bgSrc: string;
  /** Background music (optional); pair with bg in dashboard via video theme. */
  musicSrc: string;
  logoSrc: string;
  /** When false, the circular brand logo is not drawn. */
  showLogo: boolean;
  /** Decorative arrow between before and after images (left side). */
  showArrow: boolean;
  /** Large top headline (brand title). */
  headlineColorHex: string;
  /** Service line below images. */
  captionColorHex: string;
  /** Shown below the before/after block (e.g. service name). */
  serviceTitle: string;
  /** Font for the large brand headline at the top. */
  brandTitleFontId: string;
  /** Font for the service title line (Google Fonts, preloaded). */
  serviceFontId: string;
  durationInFrames: number;
};

export const BeforeAfterTemplate: FC<BeforeAfterTemplateProps> = ({
  titleText,
  subtitleText,
  showPriceTag,
  priceTagText,
  topImageSrc,
  bottomImageSrc,
  bgSrc,
  musicSrc,
  logoSrc,
  showLogo,
  showArrow,
  headlineColorHex,
  captionColorHex,
  serviceTitle,
  brandTitleFontId,
  serviceFontId,
}) => {
  const [fontBlock] = useState(() => delayRender());

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

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.96, 1.04],
  );

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

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          opacity: fade,
        }}
      >
        <div
          style={{
            fontFamily: brandTitleResolved,
            color: headlineColor,
            fontSize: 52,
            fontWeight: brandTitleWeight,
            textAlign: "center",
            textShadow: "0 4px 24px rgba(0,0,0,0.45)",
            lineHeight: 1.15,
            maxWidth: "92%",
            marginBottom: 52,
            width: "100%",
          }}
        >
          {titleText}
        </div>

        <div
          style={{
            position: "relative",
            width: "80%",
            maxWidth: 920,
            backgroundColor: "rgba(255,255,255,0.18)",
            borderRadius: 28,
            padding: 20,
            backdropFilter: "blur(10px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Img
            src={resolveMediaSrc(topImageSrc)}
            style={{
              width: "100%",
              height: 400,
              objectFit: "cover",
              borderRadius: 20,
            }}
          />
          <Img
            src={resolveMediaSrc(bottomImageSrc)}
            style={{
              width: "100%",
              height: 400,
              objectFit: "cover",
              borderRadius: 20,
            }}
          />

          {showArrow ? (
            <Img
              src={staticFile("assets/ui/arrow-down.svg")}
              style={{
                position: "absolute",
                left: -56,
                top: "32%",
                width: 96,
                height: "auto",
                filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.35))",
              }}
            />
          ) : null}

          {showLogo && logoSrc ? (
            <div
              style={{
                position: "absolute",
                right: -72,
                top: "50%",
                transform: `translateY(-50%) scale(${pulse})`,
              }}
            >
              <Img
                src={resolveMediaSrc(logoSrc)}
                style={{
                  width: 300,
                  height: 300,
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

        {subtitleText.trim() ||
        (showPriceTag && priceTagText.trim()) ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 22,
              marginTop: 40,
              maxWidth: "92%",
            }}
          >
            {subtitleText.trim() ? (
              <div
                style={{
                  fontFamily: brandTitleResolved,
                  color: headlineColor,
                  fontSize: 36,
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
              fontSize={52}
              brandTitleFontId={brandTitleFontId}
            />
          </div>
        ) : null}

        {serviceTitle.trim() ? (
          <div
            style={{
              fontFamily: serviceFontResolved,
              color: captionColor,
              fontSize: 52,
              fontWeight: serviceFontWeight,
              textAlign: "center",
              marginTop:
                subtitleText.trim() ||
                (showPriceTag && priceTagText.trim())
                  ? 40
                  : 36,
              maxWidth: "92%",
              lineHeight: 1.2,
              textShadow: "0 4px 20px rgba(0,0,0,0.55)",
            }}
          >
            {serviceTitle.trim()}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
