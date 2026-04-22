"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandMediaLibrary } from "@/components/BrandMediaLibrary";
import { BrandSelector } from "@/components/BrandSelector";
import { isFirebaseConfigured } from "@/lib/firebase";
import { CarouselSlidesEditor } from "@/components/CarouselSlidesEditor";
import { LogoPicker } from "@/components/LogoPicker";
import { LogoPositionControls } from "@/components/LogoPositionControls";
import { MediaLibraryPicker } from "@/components/MediaLibraryPicker";
import { MediaUploader } from "@/components/MediaUploader";
import { ServiceFontPicker } from "@/components/ServiceFontPicker";
import { BackgroundMusicControls } from "@/components/BackgroundMusicControls";
import { VideoDurationControl } from "@/components/VideoDurationControl";
import { VideoTextColors } from "@/components/VideoTextColors";
import { VideoTextSizeSlider } from "@/components/VideoTextSizeSlider";
import { SignInModal } from "@/components/SignInModal";
import { AiAgentsInstructionFab } from "@/components/AiAgentsInstructionFab";
import { ThemeToggle } from "@/components/theme-toggle";
import { onAuthChange, signOut, type User } from "@/lib/auth";
import { BackgroundScene } from "@/components/ui/BackgroundScene";
import { GlassCard } from "@/components/ui/GlassCard";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { TemplateModePills } from "@/components/TemplateModePills";
import { ExportBar } from "@/components/ExportBar";
import { TweaksPanel, useTweaks } from "@/components/TweaksPanel";

const VideoPreview = dynamic(
  () =>
    import("@/components/VideoPreview").then((m) => ({
      default: m.VideoPreview,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-sm text-slate-400">Loading preview…</p>
    ),
  },
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
import { clampLogoOffset } from "@/config/logo-offset";
import {
  clampVideoTextSizeScale,
  DEFAULT_VIDEO_TEXT_SIZE_SCALE,
} from "@/config/video-text-scale";
import {
  createInitialCarouselSlides,
  type CarouselSlideDraft,
} from "@/lib/carousel-slides";
import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";

export function DashboardClient() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}

function DashboardInner() {
  const toast = useToast();
  const { state: tweaks, setState: setTweaks } = useTweaks();
  const [tweaksOpen, setTweaksOpen] = useState(false);

  // --- Template / brand / logo ---
  const [templateMode, setTemplateMode] =
    useState<TemplateModeId>(DEFAULT_TEMPLATE_MODE);
  const [activeBrandId, setActiveBrandId] = useState(brands[0]!.id);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [showLogo, setShowLogo] = useState(true);
  const [logoOffsetXPx, setLogoOffsetXPx] = useState(0);
  const [logoOffsetYPx, setLogoOffsetYPx] = useState(0);
  const logoOx = clampLogoOffset(logoOffsetXPx);
  const logoOy = clampLogoOffset(logoOffsetYPx);

  // --- Text & styling ---
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
  const [textSizeScale, setTextSizeScale] = useState(
    DEFAULT_VIDEO_TEXT_SIZE_SCALE,
  );
  const videoTextScale = clampVideoTextSizeScale(textSizeScale);

  // --- Media paths (background / music) ---
  const [backgroundPath, setBackgroundPath] = useState<string | null>(null);
  const [musicPath, setMusicPath] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [scannedMedia, setScannedMedia] = useState<{
    music: MediaAsset[];
    backgrounds: MediaAsset[];
  } | null>(null);

  // --- Uploaded files ---
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleUrl, setSingleUrl] = useState<string | null>(null);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlideDraft[]>(
    () => createInitialCarouselSlides(),
  );

  // --- Misc ---
  const [isRendering, setIsRendering] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(
    DEFAULT_DURATION_SECONDS,
  );
  const [showBeforeAfterArrow, setShowBeforeAfterArrow] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- Section open/close (default: identity + content open) ---
  const [openIdentity, setOpenIdentity] = useState(true);
  const [openContent, setOpenContent] = useState(true);
  const [openStyle, setOpenStyle] = useState(false);

  // --- Mobile tab state ---
  const [mobileTab, setMobileTab] = useState<"configure" | "preview">(
    "configure",
  );

  // --- Library picker ---
  const [libraryPicker, setLibraryPicker] = useState<{
    maxSelection: number;
    resolve: (files: File[]) => void;
  } | null>(null);

  const carouselSlidesRef = useRef(carouselSlides);
  carouselSlidesRef.current = carouselSlides;

  useEffect(() => {
    return onAuthChange((user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    setLogoFile(null);
  }, [activeBrandId]);

  useEffect(() => {
    setHeadlineColorHex(DEFAULT_HEADLINE_COLOR_HEX);
  }, [activeBrandId]);

  // --- Template switch: reset uploads (keep everything else), show toast ---
  const isFirstRender = useRef(true);
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
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    toast("Template switched — photos reset, all other settings kept", "info");
  }, [templateMode, toast]);

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
    () => mergeMediaAssets(scannedMedia?.backgrounds ?? [], BACKGROUND_VIDEOS),
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

  const libraryEnabled = isFirebaseConfigured();

  const openLibraryPicker = useCallback(
    (maxSelection: number) =>
      new Promise<File[]>((resolve) => {
        setLibraryPicker({ maxSelection, resolve });
      }),
    [],
  );

  const pickOneFromLibrary = useMemo(
    () =>
      libraryEnabled
        ? async (): Promise<File | null> => {
            const files = await openLibraryPicker(1);
            return files[0] ?? null;
          }
        : undefined,
    [libraryEnabled, openLibraryPicker],
  );

  const pickManyFromLibrary = useMemo(
    () =>
      libraryEnabled
        ? (maxFiles: number) => openLibraryPicker(maxFiles)
        : undefined,
    [libraryEnabled, openLibraryPicker],
  );

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
      showArrow: showBeforeAfterArrow,
      headlineColorHex,
      captionColorHex,
      serviceTitle,
      brandTitleFontId,
      serviceFontId,
      durationInFrames: durationFrames,
      textSizeScale: videoTextScale,
      logoOffsetXPx: logoOx,
      logoOffsetYPx: logoOy,
    }),
    [
      brand,
      beforeUrl,
      afterUrl,
      logoFile,
      showLogo,
      showBeforeAfterArrow,
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
      videoTextScale,
      logoOx,
      logoOy,
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
      textSizeScale: videoTextScale,
      logoOffsetXPx: logoOx,
      logoOffsetYPx: logoOy,
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
      videoTextScale,
      logoOx,
      logoOy,
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
      textSizeScale: videoTextScale,
      logoOffsetXPx: logoOx,
      logoOffsetYPx: logoOy,
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
      videoTextScale,
      logoOx,
      logoOy,
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
        textSizeScale: videoTextScale,
        logoOffsetXPx: logoOx,
        logoOffsetYPx: logoOy,
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
        textSizeScale: videoTextScale,
        logoOffsetXPx: logoOx,
        logoOffsetYPx: logoOy,
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
      showArrow: showBeforeAfterArrow,
      headlineColorHex,
      captionColorHex,
      serviceTitle,
      brandTitleFontId,
      serviceFontId,
      durationInFrames: durationFrames,
      textSizeScale: videoTextScale,
      logoOffsetXPx: logoOx,
      logoOffsetYPx: logoOy,
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
    showBeforeAfterArrow,
    videoTextScale,
    logoOx,
    logoOy,
  ]);

  // --- Completion indicators (wired to Export bar dots + section badges) ---
  const hasBrand = Boolean(brand);
  const hasLogo = !showLogo || Boolean(logoFile);
  const hasContent =
    templateMode === "single-image"
      ? Boolean(singleFile)
      : templateMode === "carousel"
        ? carouselSlides.length > 0 && carouselSlides.every((s) => s.file)
        : Boolean(beforeFile && afterFile);

  const canExport = hasBrand && hasLogo && hasContent;

  const identityBadge = hasBrand && hasLogo ? "done" : "required";
  const contentBadge = hasContent ? "done" : "required";

  if (!authReady) {
    return (
      <>
        <BackgroundScene />
        <div className="min-h-dvh" aria-hidden />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <BackgroundScene />
        <SignInModal onSuccess={() => {}} />
        <AiAgentsInstructionFab />
      </>
    );
  }

  return (
    <>
      <BackgroundScene />
      <div className="flex min-h-dvh flex-col text-slate-100">
        {/* ------------- Header ------------- */}
        <header className="glass-bar sticky top-0 z-40 border-b">
          <div className="mx-auto flex h-[52px] w-full max-w-[1600px] items-center gap-3 px-4">
            <h1 className="text-base font-extrabold tracking-tight sm:text-lg">
              Video
              <span className="text-accent">Composer</span>
            </h1>
            <p className="hidden flex-1 truncate text-xs text-slate-400 md:block">
              Multi-brand marketing videos — choose a layout, pick a client,
              select a logo, add copy, upload media, preview, then export MP4.
            </p>
            <div className="flex flex-1 md:hidden" />
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setTweaksOpen((v) => !v)}
                className="btn-ghost rounded-lg px-2.5 py-1 text-xs font-semibold"
                aria-pressed={tweaksOpen}
              >
                Tweaks
              </button>
              {currentUser.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName ?? "User"}
                  className="h-7 w-7 rounded-full border border-white/10"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <button
                type="button"
                onClick={() => signOut()}
                className="btn-ghost rounded-lg px-2.5 py-1 text-xs font-semibold"
              >
                Sign out
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* ------------- Mobile tab bar ------------- */}
        <div className="glass-bar sticky top-[52px] z-30 border-b lg:hidden">
          <div className="mx-auto flex max-w-[1600px] gap-1 px-4 py-2">
            {(["configure", "preview"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mobileTab === tab
                    ? "bg-accent-dim text-accent"
                    : "text-slate-400 hover:bg-white/[0.04]"
                }`}
              >
                {tab === "configure" ? "Configure" : "Preview"}
              </button>
            ))}
          </div>
        </div>

        {/* ------------- Body: left config + right preview ------------- */}
        <main
          className="relative flex min-h-0 flex-1"
          style={{
            ["--left-w" as string]: "var(--sidebar-w, 380px)",
          }}
        >
          {/* Left column */}
          <aside
            className={`${mobileTab === "configure" ? "flex" : "hidden"} relative min-h-0 w-full flex-col lg:flex lg:w-[var(--left-w)] lg:shrink-0 lg:border-r lg:border-white/[0.06]`}
          >
            {/* Scrollable config area */}
            <div className="scrollbar-soft flex-1 overflow-y-auto px-4 pb-24 pt-4 lg:pb-6">
              <div className="flex flex-col gap-3">
                {/* Sticky template selector */}
                <div className="sticky top-0 z-10 -mx-1 -mt-1 px-1 pt-1 pb-2">
                  <TemplateModePills
                    value={templateMode}
                    onChange={setTemplateMode}
                  />
                </div>

                {/* --------- Section 1 · Identity --------- */}
                <GlassCard
                  id="identity"
                  title="Identity"
                  badge={identityBadge}
                  hint={brand.displayName}
                  open={openIdentity}
                  onToggle={() => setOpenIdentity((v) => !v)}
                >
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Brand
                      </span>
                      <BrandSelector
                        brands={brands}
                        activeBrandId={activeBrandId}
                        onSelect={setActiveBrandId}
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Logo
                        </span>
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={showLogo}
                            onChange={(e) => setShowLogo(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-500 accent-accent"
                          />
                          Show in video
                        </label>
                      </div>
                      <LogoPicker
                        key={brand.id}
                        brand={brand}
                        value={logoFile}
                        onChange={setLogoFile}
                      />
                      {!showLogo ? (
                        <p className="mt-2 text-[11px] text-slate-500">
                          Logo is hidden; export does not require a logo file.
                        </p>
                      ) : null}
                      <div className="mt-3">
                        <LogoPositionControls
                          offsetXPx={logoOx}
                          offsetYPx={logoOy}
                          onOffsetXChange={setLogoOffsetXPx}
                          onOffsetYChange={setLogoOffsetYPx}
                          disabled={!showLogo}
                        />
                      </div>
                    </div>

                    <details className="group rounded-lg border border-white/10 bg-white/[0.02]">
                      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-slate-300 transition hover:text-slate-100">
                        <span className="mr-1 inline-block transition group-open:rotate-90">
                          ›
                        </span>
                        Brand media library
                      </summary>
                      <div className="border-t border-white/10 p-3">
                        <BrandMediaLibrary
                          key={brand.id}
                          brandId={brand.id}
                          brandLabel={brand.displayName}
                        />
                      </div>
                    </details>
                  </div>
                </GlassCard>

                {/* --------- Section 2 · Content --------- */}
                <GlassCard
                  id="content"
                  title="Content"
                  badge={contentBadge}
                  hint={
                    templateMode === "single-image"
                      ? "1 hero image"
                      : templateMode === "carousel"
                        ? `${carouselSlides.length} slide${carouselSlides.length === 1 ? "" : "s"}`
                        : "Before + After photos"
                  }
                  open={openContent}
                  onToggle={() => setOpenContent((v) => !v)}
                >
                  {templateMode === "single-image" ? (
                    <MediaUploader
                      label="Hero image"
                      description="One photo for promos, products, or non-transformation content."
                      imageSrc={singleUrl}
                      onFile={setSingle}
                      sourceFile={singleFile}
                      onPickFromLibrary={pickOneFromLibrary}
                    />
                  ) : templateMode === "carousel" ? (
                    <CarouselSlidesEditor
                      slides={carouselSlides}
                      onChange={setCarouselSlides}
                      onPickFromLibrary={pickOneFromLibrary}
                      onBulkAddFromLibrary={pickManyFromLibrary}
                    />
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <MediaUploader
                          label="Before"
                          description='Upload the "before" photo.'
                          imageSrc={beforeUrl}
                          onFile={setBefore}
                          sourceFile={beforeFile}
                          onPickFromLibrary={pickOneFromLibrary}
                        />
                        <MediaUploader
                          label="After"
                          description='Upload the "after" photo.'
                          imageSrc={afterUrl}
                          onFile={setAfter}
                          sourceFile={afterFile}
                          onPickFromLibrary={pickOneFromLibrary}
                        />
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={showBeforeAfterArrow}
                          onChange={(e) =>
                            setShowBeforeAfterArrow(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-500 accent-accent"
                        />
                        Show arrow between before &amp; after
                      </label>
                    </div>
                  )}
                </GlassCard>

                {/* --------- Section 3 · Style --------- */}
                <GlassCard
                  id="style"
                  title="Style"
                  badge="optional"
                  hint={`${durationSeconds}s · ${Math.round(videoTextScale * 100)}% text`}
                  open={openStyle}
                  onToggle={() => setOpenStyle((v) => !v)}
                >
                  <div className="flex flex-col gap-5">
                    {/* Colors */}
                    <div>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Text colors
                      </span>
                      <VideoTextColors
                        headlineColorHex={headlineColorHex}
                        captionColorHex={captionColorHex}
                        defaultHeadlineHex={DEFAULT_HEADLINE_COLOR_HEX}
                        onHeadlineChange={setHeadlineColorHex}
                        onCaptionChange={setCaptionColorHex}
                      />
                    </div>

                    {/* Copy */}
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Copy
                      </span>
                      {templateMode !== "carousel" ? (
                        <label className="flex flex-col gap-1 text-xs text-slate-300">
                          Service title
                          <input
                            type="text"
                            value={serviceTitle}
                            onChange={(e) => setServiceTitle(e.target.value)}
                            placeholder="e.g. Signature Hydra Facial"
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25"
                          />
                        </label>
                      ) : null}
                      <label className="flex flex-col gap-1 text-xs text-slate-300">
                        Subtitle
                        <input
                          type="text"
                          value={subtitleText}
                          onChange={(e) => setSubtitleText(e.target.value)}
                          placeholder="e.g. Beauty & Wellness"
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25"
                        />
                      </label>
                      <div>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={showPriceTag}
                            onChange={(e) =>
                              setShowPriceTag(e.target.checked)
                            }
                            className="h-3.5 w-3.5 rounded border-slate-500 accent-accent"
                          />
                          Show price tag
                        </label>
                        {showPriceTag ? (
                          <input
                            type="text"
                            value={priceTagText}
                            onChange={(e) =>
                              setPriceTagText(e.target.value)
                            }
                            placeholder="e.g. $99 · From $129"
                            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25"
                          />
                        ) : null}
                      </div>
                    </div>

                    {/* Fonts */}
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Fonts
                      </span>
                      <ServiceFontPicker
                        label="Brand title font"
                        description="Typeface for the large brand name at the top of the video."
                        value={brandTitleFontId}
                        onChange={setBrandTitleFontId}
                      />
                      <ServiceFontPicker
                        label={
                          templateMode === "carousel"
                            ? "Slide caption font"
                            : "Service title font"
                        }
                        description={
                          templateMode === "carousel"
                            ? "Typeface for each slide title under the image."
                            : "Typeface for the service line below the photos."
                        }
                        value={serviceFontId}
                        onChange={setServiceFontId}
                      />
                      <VideoTextSizeSlider
                        value={videoTextScale}
                        onChange={setTextSizeScale}
                      />
                    </div>

                    {/* Background & music */}
                    <div>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Background & music
                      </span>
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

                    {/* Duration */}
                    <div>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Video length
                      </span>
                      <VideoDurationControl
                        durationSeconds={durationSeconds}
                        onChange={setDurationSeconds}
                      />
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>

            {/* Sticky tweaks drawer (inside sidebar, above export bar) */}
            <TweaksPanel
              open={tweaksOpen}
              onClose={() => setTweaksOpen(false)}
              state={tweaks}
              setState={setTweaks}
            />
          </aside>

          {/* Right column — preview (sticky, grows with viewport height) */}
          <section
            className={`${mobileTab === "preview" ? "flex" : "hidden"} relative min-h-0 flex-1 lg:flex lg:overflow-y-auto`}
          >
            <div
              aria-hidden
              className="preview-ambient pointer-events-none absolute inset-0"
            />
            <div className="relative flex w-full flex-1 flex-col items-center justify-start px-4 py-6 lg:justify-center lg:px-8">
              <div className="flex w-full flex-col items-center gap-3 lg:sticky lg:top-4">
                <div
                  className="aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_-20px_rgba(0,0,0,0.7)]"
                  style={{
                    /* Width-driven: never exceeds parent width, and never large
                     * enough to push height past the viewport (aspect-ratio
                     * derives height automatically). Works on mobile + desktop
                     * without forcing the ratio to break. */
                    width: "min(100%, calc((100dvh - 180px) * 9 / 16))",
                  }}
                >
                  <VideoPreview
                    mode={templateMode}
                    beforeAfterProps={beforeAfterProps}
                    singleImageProps={singleImageProps}
                    carouselProps={carouselProps}
                  />
                </div>
                <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  {durationSeconds}s · 9:16 · MP4
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* ------------- Export bar (sticky bottom, full width) ------------- */}
        <ExportBar
          hasBrand={hasBrand}
          hasLogo={hasLogo}
          hasContent={hasContent}
          canExport={canExport}
          compositionId={templateModeToCompositionId(templateMode)}
          getInputProps={getInputProps}
          onBusyChange={setIsRendering}
        />
      </div>

      <AiAgentsInstructionFab />
      <MediaLibraryPicker
        open={libraryPicker !== null}
        brandId={brand.id}
        brandLabel={brand.displayName}
        maxSelection={libraryPicker?.maxSelection ?? 1}
        onClose={() => {
          if (libraryPicker) libraryPicker.resolve([]);
          setLibraryPicker(null);
        }}
        onApply={(files) => {
          if (libraryPicker) libraryPicker.resolve(files);
          setLibraryPicker(null);
        }}
      />

      {/* isRendering state is hoisted so sidebars can react to it later if needed */}
      <span className="sr-only" aria-live="polite">
        {isRendering ? "Rendering video" : ""}
      </span>
    </>
  );
}
