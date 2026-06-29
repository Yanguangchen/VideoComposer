import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

import { mergeMediaAssets, originPublicUrl, publicAssetUrl } from "../src/config/background-music";
import { brandLogoPublicUrl, brands, getBrandById } from "../src/config/brands";
import { clampLogoOffset } from "../src/config/logo-offset";
import { isServiceFontId } from "../src/config/service-fonts";
import { templateModeToCompositionId } from "../src/config/template-modes";
import {
  clampDurationFrames,
  clampDurationSeconds,
  secondsToDurationFrames,
} from "../src/config/video-duration";
import { clampVideoTextSizeScale } from "../src/config/video-text-scale";
import { createCarouselSlide, createInitialCarouselSlides } from "../src/lib/carousel-slides";
import { parseRenderErrorResponse } from "../src/lib/render-client";
import { getServerlessExportBlockMessage } from "../src/lib/render-environment";
import { remotionWebpackOverride } from "../src/remotion/webpack-override";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("media configuration", () => {
  it("merges by path with configured entries winning and sorts by label", () => {
    const result = mergeMediaAssets(
      [
        { id: "1", label: "Zulu", publicPath: "same.mp3" },
        { id: "2", label: "alpha", publicPath: "other.mp3" },
      ],
      [{ id: "3", label: "Beta", publicPath: "same.mp3" }],
    );
    assert.deepEqual(
      result.map((item) => item.id),
      ["2", "3"],
    );
  });

  it("builds relative and absolute public URLs", () => {
    assert.equal(publicAssetUrl("/music/a b.mp3"), "/music/a b.mp3");
    assert.equal(publicAssetUrl("music/a.mp3"), "/music/a.mp3");
    assert.equal(originPublicUrl("https://example.test", ""), "");
    assert.equal(
      originPublicUrl("https://example.test", "/music/a b.mp3"),
      "https://example.test/music/a%20b.mp3",
    );
  });
});

describe("brand and template configuration", () => {
  it("finds brands and safely constructs logo paths", () => {
    const brand = brands[0]!;
    assert.equal(getBrandById(brand.id), brand);
    assert.equal(getBrandById("missing"), undefined);
    assert.equal(brandLogoPublicUrl(brand, "///logo.png"), `/${brand.logoFolder}/logo.png`);
  });

  it("maps every template mode to its composition", () => {
    assert.equal(templateModeToCompositionId("before-after"), "BeforeAfter");
    assert.equal(templateModeToCompositionId("single-image"), "SingleImage");
    assert.equal(templateModeToCompositionId("carousel"), "Carousel");
  });

  it("recognizes supported service fonts", () => {
    assert.equal(isServiceFontId("outfit"), true);
    assert.equal(isServiceFontId("comic-sans"), false);
  });
});

describe("numeric clamps", () => {
  it("clamps logo offsets and invalid values", () => {
    assert.equal(clampLogoOffset(-500), -400);
    assert.equal(clampLogoOffset(500), 400);
    assert.equal(clampLogoOffset(12), 12);
    assert.equal(clampLogoOffset(Number.NaN), 0);
  });

  it("converts and clamps video durations", () => {
    assert.equal(secondsToDurationFrames(2.5), 75);
    assert.equal(clampDurationSeconds(1), 2);
    assert.equal(clampDurationSeconds(100), 90);
    assert.equal(clampDurationSeconds(10), 10);
    assert.equal(clampDurationFrames(1), 60);
    assert.equal(clampDurationFrames(3_000), 2_700);
    assert.equal(clampDurationFrames(75.6), 76);
  });

  it("clamps text scale and resets invalid values", () => {
    assert.equal(clampVideoTextSizeScale(0), 0.65);
    assert.equal(clampVideoTextSizeScale(2), 1.65);
    assert.equal(clampVideoTextSizeScale(1.2), 1.2);
    assert.equal(clampVideoTextSizeScale(Number.POSITIVE_INFINITY), 1);
  });
});

describe("carousel slide factories", () => {
  it("creates unique empty drafts and a two-slide initial state", () => {
    vi.spyOn(Date, "now").mockReturnValue(123);
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1).mockReturnValueOnce(0.2);
    const slides = createInitialCarouselSlides();
    assert.equal(slides.length, 2);
    assert.notEqual(slides[0]!.id, slides[1]!.id);
    assert.deepEqual(
      { ...slides[0], id: "ignored" },
      {
        id: "ignored",
        file: null,
        url: null,
        title: "",
      },
    );
    assert.match(createCarouselSlide().id, /^slide-123-/);
  });
});

describe("render response parsing", () => {
  it("uses JSON errors, plain text, and a status fallback", async () => {
    assert.equal(
      await parseRenderErrorResponse(Response.json({ error: "  broken  " }, { status: 500 })),
      "broken",
    );
    assert.equal(
      await parseRenderErrorResponse(new Response("plain failure", { status: 500 })),
      "plain failure",
    );
    assert.equal(
      await parseRenderErrorResponse(new Response("", { status: 418 })),
      "Request failed (418)",
    );
    assert.equal(
      await parseRenderErrorResponse(Response.json({ error: 42 }, { status: 500 })),
      '{"error":42}',
    );
  });
});

describe("serverless export detection", () => {
  it("allows explicit overrides and blocks known serverless hosts", () => {
    process.env.REMOTION_ALLOW_EXPORT_ON_SERVERLESS = "1";
    process.env.VERCEL = "1";
    assert.equal(getServerlessExportBlockMessage(), null);

    delete process.env.REMOTION_ALLOW_EXPORT_ON_SERVERLESS;
    assert.match(getServerlessExportBlockMessage()!, /Vercel/);
    delete process.env.VERCEL;
    process.env.NETLIFY = "1";
    assert.match(getServerlessExportBlockMessage()!, /Netlify/);
    delete process.env.NETLIFY;
    assert.equal(getServerlessExportBlockMessage(), null);
  });
});

describe("Remotion webpack override", () => {
  it("adds the source alias while preserving object aliases", () => {
    const config = { resolve: { alias: { existing: "value" } } } as never;
    const result = remotionWebpackOverride(config);
    assert.equal((result.resolve!.alias as Record<string, string>).existing, "value");
    assert.match((result.resolve!.alias as Record<string, string>)["@"]!, /src$/);
  });

  it("handles absent and non-object alias configuration", () => {
    const noResolve = remotionWebpackOverride({} as never);
    assert.ok((noResolve.resolve!.alias as Record<string, string>)["@"]);
    const arrayAlias = remotionWebpackOverride({ resolve: { alias: [] } } as never);
    assert.deepEqual(Object.keys(arrayAlias.resolve!.alias as object), ["@"]);
  });
});
