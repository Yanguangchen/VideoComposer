// @vitest-environment jsdom

import assert from "node:assert/strict";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, it, vi } from "vitest";

const remotionState = vi.hoisted(() => ({ frame: 20, durationInFrames: 150, continueRender: vi.fn(), delayRender: vi.fn(() => 1) }));

vi.mock("remotion", async () => {
  const ReactModule = await import("react");
  const box = (name: string) => ({ children }: any) => ReactModule.createElement("div", { "data-remotion": name }, children);
  return {
    AbsoluteFill: box("fill"),
    Audio: ({ src, volume }: any) => <div data-testid="audio" data-src={src} data-volume={volume} />,
    Img: ({ src, alt, style }: any) => <img src={src} alt={alt ?? ""} style={style} />,
    Sequence: ({ children, from, durationInFrames }: any) => <section data-from={from} data-duration={durationInFrames}>{children}</section>,
    Video: ({ src }: any) => <video data-src={src} />,
    continueRender: remotionState.continueRender,
    delayRender: remotionState.delayRender,
    staticFile: (path: string) => `/static/${path}`,
    useCurrentFrame: () => remotionState.frame,
    useVideoConfig: () => ({ fps: 30, durationInFrames: remotionState.durationInFrames }),
    interpolate: (value: number, input: number[], output: number[]) => {
      if (value <= input[0]!) return output[0]!;
      if (value >= input.at(-1)!) return output.at(-1)!;
      const ratio = (value - input[0]!) / (input.at(-1)! - input[0]!);
      return output[0]! + ratio * (output.at(-1)! - output[0]!);
    },
    Easing: { out: (fn: unknown) => fn, in: (fn: unknown) => fn, cubic: (x: number) => x },
  };
});
vi.mock("../src/remotion/service-font-loaders", async () => {
  const actual = await vi.importActual<any>("../src/remotion/service-font-loaders");
  return { ...actual, preloadAllServiceFonts: vi.fn(async () => undefined) };
});

import { BeforeAfterTemplate, type BeforeAfterTemplateProps } from "../src/remotion/before-after-template";
import { CarouselTemplate, type CarouselTemplateProps } from "../src/remotion/carousel-template";
import { SingleImageTemplate, type SingleImageTemplateProps } from "../src/remotion/single-image-template";

const common = {
  brandId: "brand",
  titleText: "Brand Title",
  subtitleText: "Subtitle",
  showPriceTag: true,
  priceTagText: "$99",
  bgSrc: "/background.jpg",
  musicSrc: "/music.mp3",
  logoSrc: "/logo.svg",
  showLogo: true,
  headlineColorHex: "invalid",
  captionColorHex: "#abcdef",
  brandTitleFontId: "bebas-neue",
  serviceFontId: "dancing-script",
  durationInFrames: 150,
  textSizeScale: 1.2,
  logoOffsetXPx: 10,
  logoOffsetYPx: -10,
};

afterEach(() => {
  cleanup();
  remotionState.frame = 20;
  remotionState.durationInFrames = 150;
  vi.clearAllMocks();
});

describe("BeforeAfterTemplate", () => {
  const props: BeforeAfterTemplateProps = {
    ...common,
    serviceTitle: "Transformation",
    topImageSrc: "/before.jpg",
    bottomImageSrc: "/after.jpg",
    showArrow: true,
  };

  it("renders full media, copy, branding, arrow, price, and audio", async () => {
    render(<BeforeAfterTemplate {...props} />);
    await waitFor(() => assert.ok(screen.getByText("Brand Title")));
    assert.ok(screen.getByText("Transformation"));
    assert.ok(screen.getByText("Subtitle"));
    assert.ok(screen.getByText("$99"));
    assert.ok(document.querySelector(`img[src*="arrow-down"]`));
    assert.ok(document.querySelectorAll("img").length >= 4);
    assert.ok(screen.getByTestId("audio"));
    assert.ok(remotionState.continueRender.mock.calls.length > 0);
  });

  it("renders fallback fonts and omits every optional layer", async () => {
    const { container } = render(<BeforeAfterTemplate
      {...props}
      subtitleText=""
      serviceTitle=""
      showPriceTag={false}
      priceTagText=""
      bgSrc=""
      musicSrc=""
      logoSrc=""
      showLogo={false}
      showArrow={false}
      brandTitleFontId="invalid"
      serviceFontId="invalid"
      textSizeScale={0}
    />);
    await waitFor(() => assert.ok(screen.getByText("Brand Title")));
    assert.equal(screen.queryByText("↓"), null);
    assert.equal(screen.queryByTestId("audio"), null);
    assert.ok(container.querySelector(`img[src*="before.jpg"]`));
    assert.ok(container.querySelector(`img[src*="after.jpg"]`));
  });
});

describe("SingleImageTemplate", () => {
  const props: SingleImageTemplateProps = {
    ...common,
    serviceTitle: "Service",
    imageSrc: "/hero.jpg",
  };

  it("renders full single-image content", async () => {
    render(<SingleImageTemplate {...props} />);
    await waitFor(() => assert.ok(screen.getByText("Brand Title")));
    assert.ok(screen.getByText("Service"));
    assert.ok(screen.getByText("Subtitle"));
    assert.ok(screen.getByText("$99"));
    assert.ok(screen.getByTestId("audio"));
  });

  it("omits optional single-image content with invalid fonts", async () => {
    render(<SingleImageTemplate
      {...props}
      subtitleText=""
      serviceTitle=""
      showPriceTag={false}
      bgSrc=""
      musicSrc=""
      logoSrc=""
      showLogo={false}
      brandTitleFontId="invalid"
      serviceFontId="invalid"
    />);
    await waitFor(() => assert.ok(screen.getByText("Brand Title")));
    assert.equal(screen.queryByTestId("audio"), null);
    assert.equal(screen.queryByText("Service"), null);
  });
});

describe("CarouselTemplate", () => {
  const props: CarouselTemplateProps = {
    ...common,
    slides: [
      { imageSrc: "/one.jpg", title: "First slide" },
      { imageSrc: "/two.jpg", title: "Second slide" },
    ],
  };

  it("sequences every slide with captions, branding, price, and audio", async () => {
    render(<CarouselTemplate {...props} />);
    await waitFor(() => assert.ok(screen.getByText("Brand Title")));
    assert.ok(screen.getByText("First slide"));
    assert.ok(screen.getByText("Second slide"));
    assert.equal(document.querySelectorAll("section").length, 2);
    assert.ok(screen.getAllByText("$99").length >= 2);
    assert.ok(screen.getByTestId("audio"));
  });

  it("uses a fallback slide and omits optional slide layers", async () => {
    remotionState.durationInFrames = 1;
    render(<CarouselTemplate
      {...props}
      slides={[]}
      subtitleText=""
      showPriceTag={false}
      bgSrc=""
      musicSrc=""
      logoSrc=""
      showLogo={false}
      brandTitleFontId="invalid"
      serviceFontId="invalid"
      textSizeScale={0}
    />);
    await waitFor(() => assert.ok(screen.getByText("Brand Title")));
    assert.equal(screen.queryByTestId("audio"), null);
    assert.equal(document.querySelectorAll("section").length, 1);
  });
});
