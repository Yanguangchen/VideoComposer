import { Composition } from "remotion";
import {
  clampDurationFrames,
  DEFAULT_DURATION_FRAMES,
} from "@/config/video-duration";
import { DEFAULT_SERVICE_FONT_ID } from "@/config/service-fonts";
import {
  DEFAULT_CAPTION_COLOR_HEX,
  DEFAULT_HEADLINE_COLOR_HEX,
} from "@/lib/hex-color";
import { brands } from "../config/brands";
import {
  BeforeAfterTemplate,
  type BeforeAfterTemplateProps,
} from "./before-after-template";
import {
  CAROUSEL_FRAMES_PER_SLIDE,
  CarouselTemplate,
  type CarouselTemplateProps,
} from "./carousel-template";
import {
  SingleImageTemplate,
  type SingleImageTemplateProps,
} from "./single-image-template";

const defaultBrand = brands[0]!;

export const defaultBeforeAfterProps: BeforeAfterTemplateProps = {
  brandId: defaultBrand.id,
  titleText: defaultBrand.displayName,
  topImageSrc: "",
  bottomImageSrc: "",
  bgSrc: "",
  musicSrc: "",
  logoSrc: `/${defaultBrand.logoFolder}/logo.svg`,
  showLogo: true,
  headlineColorHex: DEFAULT_HEADLINE_COLOR_HEX,
  captionColorHex: DEFAULT_CAPTION_COLOR_HEX,
  serviceTitle: "",
  brandTitleFontId: DEFAULT_SERVICE_FONT_ID,
  serviceFontId: DEFAULT_SERVICE_FONT_ID,
  durationInFrames: DEFAULT_DURATION_FRAMES,
};

export const defaultSingleImageProps: SingleImageTemplateProps = {
  brandId: defaultBrand.id,
  titleText: defaultBrand.displayName,
  imageSrc: "",
  bgSrc: "",
  musicSrc: "",
  logoSrc: `/${defaultBrand.logoFolder}/logo.svg`,
  showLogo: true,
  headlineColorHex: DEFAULT_HEADLINE_COLOR_HEX,
  captionColorHex: DEFAULT_CAPTION_COLOR_HEX,
  serviceTitle: "",
  brandTitleFontId: DEFAULT_SERVICE_FONT_ID,
  serviceFontId: DEFAULT_SERVICE_FONT_ID,
  durationInFrames: DEFAULT_DURATION_FRAMES,
};

export const defaultCarouselProps: CarouselTemplateProps = {
  brandId: defaultBrand.id,
  titleText: defaultBrand.displayName,
  bgSrc: "",
  musicSrc: "",
  logoSrc: `/${defaultBrand.logoFolder}/logo.svg`,
  showLogo: true,
  headlineColorHex: DEFAULT_HEADLINE_COLOR_HEX,
  captionColorHex: DEFAULT_CAPTION_COLOR_HEX,
  slides: [{ imageSrc: "", title: "" }],
  brandTitleFontId: DEFAULT_SERVICE_FONT_ID,
  serviceFontId: DEFAULT_SERVICE_FONT_ID,
  durationInFrames: DEFAULT_DURATION_FRAMES,
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="BeforeAfter"
        component={BeforeAfterTemplate}
        durationInFrames={DEFAULT_DURATION_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultBeforeAfterProps}
        calculateMetadata={async ({ props }) => {
          const p = props as BeforeAfterTemplateProps;
          return {
            durationInFrames: clampDurationFrames(
              p.durationInFrames ?? DEFAULT_DURATION_FRAMES,
            ),
          };
        }}
      />
      <Composition
        id="SingleImage"
        component={SingleImageTemplate}
        durationInFrames={DEFAULT_DURATION_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultSingleImageProps}
        calculateMetadata={async ({ props }) => {
          const p = props as SingleImageTemplateProps;
          return {
            durationInFrames: clampDurationFrames(
              p.durationInFrames ?? DEFAULT_DURATION_FRAMES,
            ),
          };
        }}
      />
      <Composition
        id="Carousel"
        component={CarouselTemplate}
        durationInFrames={DEFAULT_DURATION_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultCarouselProps}
        calculateMetadata={async ({ props }) => {
          const p = props as CarouselTemplateProps;
          const n = Math.max(1, p.slides?.length ?? 1);
          const required = n * CAROUSEL_FRAMES_PER_SLIDE;
          const user = clampDurationFrames(
            p.durationInFrames ?? required,
          );
          return {
            durationInFrames: Math.max(user, required),
          };
        }}
      />
    </>
  );
};
