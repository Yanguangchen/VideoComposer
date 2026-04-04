"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandSelector } from "@/components/BrandSelector";
import { CarouselSlidesEditor } from "@/components/CarouselSlidesEditor";
import { LogoPicker } from "@/components/LogoPicker";
import { MediaUploader } from "@/components/MediaUploader";
import { RenderAndDownload } from "@/components/RenderAndDownload";
import { ServiceFontPicker } from "@/components/ServiceFontPicker";
import { TemplateModeToggle } from "@/components/TemplateModeToggle";
import { BackgroundMusicControls } from "@/components/BackgroundMusicControls";
import { VideoDurationControl } from "@/components/VideoDurationControl";
import { VideoTextColors } from "@/components/VideoTextColors";

const VideoPreview = dynamic(
  () =>
    import("@/components/VideoPreview").then((m) => ({
      default: m.VideoPreview,
    })),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading preview…</p> },
);
import { brandLogoPublicUrl, brands, getBrandById } from "@/config/brands";
import {
  DEFAULT_TEMPLATE_MODE,
  templateModeToCompositionId,
  type TemplateModeId,
} from "@/config/template-modes";
import {
  DEFAULT_SERVICE_FONT_ID,
  type ServiceFontId,
} from "@/config/service-fonts";
import { fileToDataUrl } from "@/lib/files";
import {
  DEFAULT_CAPTION_COLOR_HEX,
  DEFAULT_HEADLINE_COLOR_HEX,
} from "@/lib/hex-color";
import {
  type MediaAsset,
  BACKGROUND_VIDEOS,
  mergeMediaAssets,
  MUSIC_TRACKS,
  originPublicUrl,
  publicAssetUrl,
} from "@/config/background-music";
import {
  clampDurationSeconds,
  DEFAULT_DURATION_SECONDS,
  secondsToDurationFrames,
} from "@/config/video-duration";
import {
  createInitialCarouselSlides,
  type CarouselSlideDraft,
} from "@/lib/carousel-slides";
import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";

export function DashboardClient() {
  const [templateMode, setTemplateMode] =
    useState<TemplateModeId>(DEFAULT_TEMPLATE_MODE);
  const [activeBrandId, setActiveBrandId] = useState(brands[0]!.id);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [showLogo, setShowLogo] = useState(true);
  const [serviceTitle, setServiceTitle] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const [showPriceTag, setShowPriceTag] = useState(false);
  const [priceTagText, setPriceTagText] = useState("");
  const [brandTitleFontId, setBrandTitleFontId] =
    useState<ServiceFontId>(DEFAULT_SERVICE_FONT_ID);
  const [serviceFontId, setServiceFontId] =
    useState<ServiceFontId>(DEFAULT_SERVICE_FONT_ID);
  const [headlineColorHex, setHeadlineColorHex] = useState(
    () => DEFAULT_HEADLINE_COLOR_HEX,
  );
  const [captionColorHex, setCaptionColorHex] = useState(
    () => DEFAULT_CAPTION_COLOR_HEX,
  );
  /** `public/` relative paths, e.g. `music/bed.mp3` */
  const [backgroundPath, setBackgroundPath] = useState<string | null>(null);
  const [musicPath, setMusicPath] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [scannedMedia, setScannedMedia] = useState<{
    music: MediaAsset[];
    backgrounds: MediaAsset[];
  } | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleUrl, setSingleUrl] = useState<string | null>(null);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlideDraft[]>(
    () => createInitialCarouselSlides(),
  );
  const [isRendering, setIsRendering] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(
    DEFAULT_DURATION_SECONDS,
  );

  const carouselSlidesRef = useRef(carouselSlides);
  carouselSlidesRef.current = carouselSlides;

  useEffect(() => {
    setLogoFile(null);
  }, [activeBrandId]);

  useEffect(() => {
    setHeadlineColorHex(DEFAULT_HEADLINE_COLOR_HEX);
  }, [activeBrandId]);

  useEffect(() => {
    setBeforeFile(null);
    setAfterFile(null);
    setSingleFile(null);
    setBeforeUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAfterUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSingleUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCarouselSlides((prev) => {
      prev.forEach((s) => {
        if (s.url) URL.revokeObjectURL(s.url);
      });
      return createInitialCarouselSlides();
    });
  }, [templateMode]);

  useEffect(() => {
    return () => {
      if (beforeUrl) URL.revokeObjectURL(beforeUrl);
      if (afterUrl) URL.revokeObjectURL(afterUrl);
      if (singleUrl) URL.revokeObjectURL(singleUrl);
    };
  }, [beforeUrl, afterUrl, singleUrl]);

  useEffect(() => {
    return () => {
      carouselSlidesRef.current.forEach((s) => {
        if (s.url) URL.revokeObjectURL(s.url);
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMediaLoading(true);
    fetch("/api/public-media")
      .then((r) => r.json())
      .then((data: { music?: unknown; backgrounds?: unknown }) => {
        if (cancelled) return;
        setScannedMedia({
          music: Array.isArray(data.music) ? data.music : [],
          backgrounds: Array.isArray(data.backgrounds) ? data.backgrounds : [],
        });
      })
      .catch(() => {
        if (!cancelled) {
          setScannedMedia({ music: [], backgrounds: [] });
        }
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const backgroundOptions = useMemo(
    () =>
      mergeMediaAssets(
        scannedMedia?.backgrounds ?? [],
        BACKGROUND_VIDEOS,
      ),
    [scannedMedia],
  );

  const musicOptions = useMemo(
    () => mergeMediaAssets(scannedMedia?.music ?? [], MUSIC_TRACKS),
    [scannedMedia],
  );

  const durationFrames = useMemo(
    () => secondsToDurationFrames(clampDurationSeconds(durationSeconds)),
    [durationSeconds],
  );

  const setBefore = useCallback((file: File | null) => {
    setBeforeUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setBeforeFile(file);
  }, []);

  const setAfter = useCallback((file: File | null) => {
    setAfterUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setAfterFile(file);
  }, []);

  const setSingle = useCallback((file: File | null) => {
    setSingleUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setSingleFile(file);
  }, []);

  const brand = getBrandById(activeBrandId) ?? brands[0]!;

  const backgroundAndMusicPaths = useMemo(
    () => ({
      bgSrc: backgroundPath ? publicAssetUrl(backgroundPath) : "",
      musicSrc: musicPath ? publicAssetUrl(musicPath) : "",
    }),
    [backgroundPath, musicPath],
  );

  const beforeAfterProps: BeforeAfterTemplateProps = useMemo(
    () => ({
      brandId: brand.id,
      titleText: brand.displayName,
      subtitleText,
      showPriceTag,
      priceTagText,
      topImageSrc: beforeUrl ?? "",
      bottomImageSrc: afterUrl ?? "",
      bgSrc: backgroundAndMusicPaths.bgSrc,
      musicSrc: backgroundAndMusicPaths.musicSrc,
      logoSrc:
        showLogo && logoFile ? brandLogoPublicUrl(brand, logoFile) : "",
      showLogo,
      headlineColorHex,
      captionColorHex,
      serviceTitle,
      brandTitleFontId,
      serviceFontId,
      durationInFrames: durationFrames,
    }),
    [
      brand,
      beforeUrl,
      afterUrl,
      logoFile,
      showLogo,
      backgroundAndMusicPaths.bgSrc,
      backgroundAndMusicPaths.musicSrc,
      headlineColorHex,
      captionColorHex,
      serviceTitle,
      subtitleText,
      showPriceTag,
      priceTagText,
      brandTitleFontId,
      serviceFontId,
      durationFrames,
    ],
  );

  const singleImageProps: SingleImageTemplateProps = useMemo(
    () => ({
      brandId: brand.id,
      titleText: brand.displayName,
      subtitleText,
      showPriceTag,
      priceTagText,
      imageSrc: singleUrl ?? "",
      bgSrc: backgroundAndMusicPaths.bgSrc,
      musicSrc: backgroundAndMusicPaths.musicSrc,
      logoSrc:
        showLogo && logoFile ? brandLogoPublicUrl(brand, logoFile) : "",
      showLogo,
      headlineColorHex,
      captionColorHex,
      serviceTitle,
      brandTitleFontId,
      serviceFontId,
      durationInFrames: durationFrames,
    }),
    [
      brand,
      singleUrl,
      logoFile,
      showLogo,
      backgroundAndMusicPaths.bgSrc,
      backgroundAndMusicPaths.musicSrc,
      headlineColorHex,
      captionColorHex,
      serviceTitle,
      subtitleText,
      showPriceTag,
      priceTagText,
      brandTitleFontId,
      serviceFontId,
      durationFrames,
    ],
  );

  const carouselProps: CarouselTemplateProps = useMemo(
    () => ({
      brandId: brand.id,
      titleText: brand.displayName,
      subtitleText,
      showPriceTag,
      priceTagText,
      bgSrc: backgroundAndMusicPaths.bgSrc,
      musicSrc: backgroundAndMusicPaths.musicSrc,
      logoSrc:
        showLogo && logoFile ? brandLogoPublicUrl(brand, logoFile) : "",
      showLogo,
      headlineColorHex,
      captionColorHex,
      slides: carouselSlides.map((s) => ({
        imageSrc: s.url ?? "",
        title: s.title,
      })),
      brandTitleFontId,
      serviceFontId,
      durationInFrames: durationFrames,
    }),
    [
      brand,
      carouselSlides,
      logoFile,
      showLogo,
      backgroundAndMusicPaths.bgSrc,
      backgroundAndMusicPaths.musicSrc,
      headlineColorHex,
      captionColorHex,
      subtitleText,
      showPriceTag,
      priceTagText,
      brandTitleFontId,
      serviceFontId,
      durationFrames,
    ],
  );

  const getInputProps = useCallback(async () => {
    if (showLogo && !logoFile) {
      throw new Error("Select a logo from the brand folder.");
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const logoPath = logoFile ? brandLogoPublicUrl(brand, logoFile) : "";
    const logoSrcForRender =
      showLogo && logoPath ? `${origin}${logoPath}` : "";
    const bgForRender = backgroundPath
      ? originPublicUrl(origin, backgroundPath)
      : "";
    const musicForRender = musicPath
      ? originPublicUrl(origin, musicPath)
      : "";

    if (templateMode === "carousel") {
      if (!carouselSlides.length) {
        throw new Error("Add at least one slide.");
      }
      if (!carouselSlides.every((s) => s.file)) {
        throw new Error("Each slide needs an image.");
      }
      const slides = await Promise.all(
        carouselSlides.map(async (s) => ({
          imageSrc: await fileToDataUrl(s.file!),
          title: s.title,
        })),
      );
      const props: CarouselTemplateProps = {
        brandId: brand.id,
        titleText: brand.displayName,
        subtitleText,
        showPriceTag,
        priceTagText,
        bgSrc: bgForRender,
        musicSrc: musicForRender,
        logoSrc: logoSrcForRender,
        showLogo,
        headlineColorHex,
        captionColorHex,
        slides,
        brandTitleFontId,
        serviceFontId,
        durationInFrames: durationFrames,
      };
      return props;
    }

    if (templateMode === "single-image") {
      if (!singleFile) {
        throw new Error("Upload an image.");
      }
      const image = await fileToDataUrl(singleFile);
      const props: SingleImageTemplateProps = {
        brandId: brand.id,
        titleText: brand.displayName,
        subtitleText,
        showPriceTag,
        priceTagText,
        imageSrc: image,
        bgSrc: bgForRender,
        musicSrc: musicForRender,
        logoSrc: logoSrcForRender,
        showLogo,
        headlineColorHex,
        captionColorHex,
        serviceTitle,
        brandTitleFontId,
        serviceFontId,
        durationInFrames: durationFrames,
      };
      return props;
    }

    if (!beforeFile || !afterFile) {
      throw new Error("Both images are required.");
    }
    const [top, bottom] = await Promise.all([
      fileToDataUrl(beforeFile),
      fileToDataUrl(afterFile),
    ]);
    const props: BeforeAfterTemplateProps = {
      brandId: brand.id,
      titleText: brand.displayName,
      subtitleText,
      showPriceTag,
      priceTagText,
      topImageSrc: top,
      bottomImageSrc: bottom,
      bgSrc: bgForRender,
      musicSrc: musicForRender,
      logoSrc: logoSrcForRender,
      showLogo,
      headlineColorHex,
      captionColorHex,
      serviceTitle,
      brandTitleFontId,
      serviceFontId,
      durationInFrames: durationFrames,
    };
    return props;
  }, [
    afterFile,
    beforeFile,
    brand,
    carouselSlides,
    headlineColorHex,
    captionColorHex,
    logoFile,
    brandTitleFontId,
    serviceFontId,
    serviceTitle,
    subtitleText,
    showPriceTag,
    priceTagText,
    singleFile,
    templateMode,
    backgroundPath,
    musicPath,
    durationFrames,
    showLogo,
  ]);

  const canExport =
    templateMode === "single-image"
      ? Boolean(singleFile && (!showLogo || logoFile))
      : templateMode === "carousel"
        ? Boolean(
            (!showLogo || logoFile) &&
              carouselSlides.length > 0 &&
              carouselSlides.every((s) => s.file),
          )
        : Boolean(beforeFile && afterFile && (!showLogo || logoFile));

  const photosHeading =
    templateMode === "single-image"
      ? "7. Image"
      : templateMode === "carousel"
        ? "7. Carousel slides"
        : "7. Before / After photos";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Video Composer
        </h1>
        <p className="text-slate-600">
          Multi-brand marketing videos — choose a layout, pick a client,
          select a logo, add copy, upload media, preview, then export MP4.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <TemplateModeToggle
              value={templateMode}
              onChange={setTemplateMode}
            />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              1. Brand
            </h2>
            <BrandSelector
              brands={brands}
              activeBrandId={activeBrandId}
              onSelect={setActiveBrandId}
            />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              2. Logo (from disk)
            </h2>
            <LogoPicker
              key={brand.id}
              brand={brand}
              value={logoFile}
              onChange={setLogoFile}
            />
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={showLogo}
                onChange={(e) => setShowLogo(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Show logo in video
            </label>
            {!showLogo ? (
              <p className="mt-1 text-xs text-slate-500">
                Logo is hidden; export does not require a logo file.
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              3. Video text colors
            </h2>
            <VideoTextColors
              headlineColorHex={headlineColorHex}
              captionColorHex={captionColorHex}
              defaultHeadlineHex={DEFAULT_HEADLINE_COLOR_HEX}
              onHeadlineChange={setHeadlineColorHex}
              onCaptionChange={setCaptionColorHex}
            />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              4. Background video & music
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <BackgroundMusicControls
                backgroundOptions={backgroundOptions}
                musicOptions={musicOptions}
                backgroundPath={backgroundPath}
                musicPath={musicPath}
                onBackgroundChange={setBackgroundPath}
                onMusicChange={setMusicPath}
                mediaLoading={mediaLoading}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              5. Text & fonts
            </h2>
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <ServiceFontPicker
                label="Brand title font"
                description="Typeface for the large brand name at the top of the video."
                value={brandTitleFontId}
                onChange={setBrandTitleFontId}
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">
                  Subtitle (optional)
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  Smaller line under the photos (same color and title font).
                </p>
                <input
                  type="text"
                  value={subtitleText}
                  onChange={(e) => setSubtitleText(e.target.value)}
                  placeholder="e.g. Beauty & Wellness"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={showPriceTag}
                    onChange={(e) => setShowPriceTag(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show price tag (below images)
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Optional pill under the images; uses the same headline color as
                  the title block.
                </p>
                {showPriceTag ? (
                  <input
                    type="text"
                    value={priceTagText}
                    onChange={(e) => setPriceTagText(e.target.value)}
                    placeholder="e.g. $99 · From $129"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                ) : null}
              </div>
              {templateMode === "carousel" ? (
                <ServiceFontPicker
                  label="Slide caption font"
                  description="Typeface for each slide title under the image (separate from the brand title)."
                  value={serviceFontId}
                  onChange={setServiceFontId}
                />
              ) : (
                <>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">
                      Service title
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      Shown below the photo block (e.g. service name or offer).
                    </p>
                    <input
                      type="text"
                      value={serviceTitle}
                      onChange={(e) => setServiceTitle(e.target.value)}
                      placeholder="e.g. Signature Hydra Facial"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                  <ServiceFontPicker
                    label="Service title font"
                    description="Typeface for the service line below the photos (independent from the brand title)."
                    value={serviceFontId}
                    onChange={setServiceFontId}
                  />
                </>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              6. Video length
            </h2>
            <VideoDurationControl
              durationSeconds={durationSeconds}
              onChange={setDurationSeconds}
            />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              {photosHeading}
            </h2>
            {templateMode === "single-image" ? (
              <MediaUploader
                label="Hero image"
                description="One photo for promos, products, or non-transformation content."
                imageSrc={singleUrl}
                onFile={setSingle}
              />
            ) : templateMode === "carousel" ? (
              <CarouselSlidesEditor
                slides={carouselSlides}
                onChange={setCarouselSlides}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaUploader
                  label="Before"
                  description="Upload the &quot;before&quot; photo."
                  imageSrc={beforeUrl}
                  onFile={setBefore}
                />
                <MediaUploader
                  label="After"
                  description="Upload the &quot;after&quot; photo."
                  imageSrc={afterUrl}
                  onFile={setAfter}
                />
              </div>
            )}
          </section>

          <RenderAndDownload
            disabled={!canExport}
            isRendering={isRendering}
            compositionId={templateModeToCompositionId(templateMode)}
            getInputProps={getInputProps}
            onBusyChange={setIsRendering}
          />
          {!canExport ? (
            <p className="text-sm text-amber-700">
              {templateMode === "single-image"
                ? showLogo
                  ? "Select a logo and upload one image to enable export."
                  : "Upload one image to enable export."
                : templateMode === "carousel"
                  ? showLogo
                    ? "Select a logo and add an image for every slide to enable export."
                    : "Add an image for every slide to enable export."
                  : showLogo
                    ? "Select a logo and upload both images to enable export."
                    : "Upload both images to enable export."}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">8. Preview</h2>
          <VideoPreview
            mode={templateMode}
            beforeAfterProps={beforeAfterProps}
            singleImageProps={singleImageProps}
            carouselProps={carouselProps}
          />
          <p className="text-xs text-slate-500">
            Logos: add files under{" "}
            <code className="rounded bg-slate-100 px-1">
              public/assets/logos/&lt;brand-id&gt;/
            </code>{" "}
            — they appear in the dropdown automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
