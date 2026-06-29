// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */

import assert from "node:assert/strict";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, vi } from "vitest";

const capturedCompositions = vi.hoisted(() => [] as Array<Record<string, any>>);

vi.mock("remotion", async () => {
  const ReactModule = await import("react");
  const element = (tag: string) => ({ children, src, ...props }: Record<string, any>) =>
    ReactModule.createElement(tag, { ...props, "data-src": src }, children);
  return {
    AbsoluteFill: element("div"),
    Audio: element("audio"),
    Composition: (props: Record<string, any>) => {
      capturedCompositions.push(props);
      return ReactModule.createElement("div", { "data-testid": `composition-${props.id}` });
    },
    Img: element("img"),
    Video: element("video"),
    Sequence: element("section"),
    continueRender: vi.fn(),
    delayRender: vi.fn(() => 1),
    interpolate: (value: number, input: number[], output: number[]) => {
      if (value <= input[0]!) return output[0]!;
      if (value >= input.at(-1)!) return output.at(-1)!;
      const ratio = (value - input[0]!) / (input.at(-1)! - input[0]!);
      return output[0]! + ratio * (output.at(-1)! - output[0]!);
    },
    staticFile: (path: string) => `/static/${path}`,
    useCurrentFrame: () => 10,
    useVideoConfig: () => ({ fps: 30, durationInFrames: 150 }),
    Easing: { out: (fn: unknown) => fn, in: (fn: unknown) => fn, cubic: (x: number) => x },
  };
});

import { BackgroundLayer, isBackgroundVideoSrc } from "../src/remotion/background-layer";
import { getEffectiveCarouselDurationInFrames } from "../src/remotion/carousel-template";
import { PriceTagBadge } from "../src/remotion/price-tag-badge";
import {
  defaultBeforeAfterProps,
  defaultCarouselProps,
  defaultSingleImageProps,
  RemotionRoot,
} from "../src/remotion/Root";

afterEach(() => {
  cleanup();
  capturedCompositions.length = 0;
});

describe("background and badges", () => {
  it("detects video extensions and renders the correct media primitive", () => {
    assert.equal(isBackgroundVideoSrc("clip.MP4"), true);
    assert.equal(isBackgroundVideoSrc("clip.webm"), true);
    assert.equal(isBackgroundVideoSrc("image.jpg"), false);
    const { rerender } = render(<BackgroundLayer bgSrc="/clip.mov" />);
    assert.equal(document.querySelector("video")?.getAttribute("data-src"), "/static/clip.mov");
    rerender(<BackgroundLayer bgSrc="/image.jpg" />);
    assert.equal(document.querySelector("img")?.getAttribute("data-src"), "/static/image.jpg");
  });

  it("hides empty price tags and renders normalized badge text and weights", () => {
    const { container, rerender } = render(<PriceTagBadge showPriceTag={false} priceTagText="$10" fontFamily="Outfit" color="#fff" fontSize={50} brandTitleFontId="outfit" />);
    assert.equal(container.textContent, "");
    rerender(<PriceTagBadge showPriceTag priceTagText="   " fontFamily="Outfit" color="#fff" fontSize={50} brandTitleFontId="outfit" />);
    assert.equal(container.textContent, "");
    rerender(<PriceTagBadge showPriceTag priceTagText="  $10  " fontFamily="Bebas Neue" color="#fff" fontSize={50} brandTitleFontId="bebas-neue" />);
    assert.equal(screen.getByText("$10").style.fontWeight, "400");
    rerender(<PriceTagBadge showPriceTag priceTagText="$20" fontFamily="Outfit" color="#fff" fontSize={50} brandTitleFontId="outfit" />);
    assert.equal(screen.getByText("$20").style.fontWeight, "700");
  });
});

describe("carousel duration", () => {
  it("clamps user duration while ensuring one frame per slide", () => {
    assert.equal(getEffectiveCarouselDurationInFrames(1, 1), 60);
    assert.equal(getEffectiveCarouselDurationInFrames(60, 100), 100);
    assert.equal(getEffectiveCarouselDurationInFrames(150, 0), 150);
  });
});

describe("RemotionRoot", () => {
  it("registers all compositions with usable defaults and metadata calculators", async () => {
    render(<RemotionRoot />);
    assert.deepEqual(capturedCompositions.map((item) => item.id), ["BeforeAfter", "SingleImage", "Carousel"]);
    assert.equal(defaultBeforeAfterProps.brandId, "le-motor");
    assert.equal(defaultSingleImageProps.durationInFrames, 150);
    assert.equal(defaultCarouselProps.slides.length, 1);
    const before = await capturedCompositions[0]!.calculateMetadata({ props: { durationInFrames: 1 } });
    const single = await capturedCompositions[1]!.calculateMetadata({ props: {} });
    const carousel = await capturedCompositions[2]!.calculateMetadata({
      props: { durationInFrames: 60, slides: Array.from({ length: 100 }) },
    });
    const defaultCarousel = await capturedCompositions[2]!.calculateMetadata({ props: {} });
    assert.deepEqual(before, { durationInFrames: 60 });
    assert.deepEqual(single, { durationInFrames: 150 });
    assert.deepEqual(carousel, { durationInFrames: 100 });
    assert.deepEqual(defaultCarousel, { durationInFrames: 150 });
  });
});
