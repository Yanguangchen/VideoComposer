import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Img,
  interpolate,
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
import {
  preloadAllServiceFonts,
  SERVICE_FONT_CSS,
} from "@/remotion/service-font-loaders";

export type SingleImageTemplateProps = {
  brandId: string;
  titleText: string;
  imageSrc: string;
  bgSrc: string;
  musicSrc: string;
  logoSrc: string;
  headlineColorHex: string;
  captionColorHex: string;
  serviceTitle: string;
  brandTitleFontId: string;
  serviceFontId: string;
  durationInFrames: number;
};

export const SingleImageTemplate: FC<SingleImageTemplateProps> = ({
  titleText,
  imageSrc,
  bgSrc,
  musicSrc,
  logoSrc,
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
            marginBottom: 36,
            textShadow: "0 4px 24px rgba(0,0,0,0.45)",
            lineHeight: 1.15,
            maxWidth: "92%",
          }}
        >
          {titleText}
        </div>

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
            src={resolveMediaSrc(imageSrc)}
            style={{
              width: "100%",
              height: 920,
              objectFit: "cover",
              borderRadius: 20,
            }}
          />

          <div
            style={{
              position: "absolute",
              right: -72,
              bottom: 40,
              transform: `scale(${pulse})`,
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
        </div>

        {serviceTitle.trim() ? (
          <div
            style={{
              fontFamily: serviceFontResolved,
              color: captionColor,
              fontSize: 52,
              fontWeight: serviceFontWeight,
              textAlign: "center",
              marginTop: 28,
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
