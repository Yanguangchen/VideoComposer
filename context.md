# Video Composer — project context

## Purpose

A **Next.js** dashboard to build **multi-brand marketing videos**: pick a template (before/after, single image, or carousel), choose a brand and assets, preview with **Remotion Player**, and **export MP4** via a server-side render route.

## Stack

- **Next.js 15** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS** + **next-themes** (dark/light)
- **Remotion 4** — compositions in `src/remotion/`, preview with `@remotion/player`, export with `@remotion/renderer` + `@remotion/bundler`
- **react-dropzone** — uploads; **react-easy-crop** — optional crop modal after upload
- **Google Fonts** — loaded in `src/app/layout.tsx` via `<link>` (`src/config/google-fonts.ts`); templates also preload via `@remotion/google-fonts` in `src/remotion/service-font-loaders.ts`

## Directory map

| Path | Role |
|------|------|
| `src/app/page.tsx` | Server page; renders `DashboardClient` |
| `src/app/dashboard-client.tsx` | Main client UI: brand, logos (incl. position nudge), media, text, fonts, video text size, duration, preview, export |
| `src/app/layout.tsx` | Root layout; ThemeProvider, viewport, PWA metadata |
| `src/app/globals.css` | Tailwind entry + mobile/safe-area tweaks |
| `src/app/api/render/route.ts` | `POST` — bundles Remotion, `renderMedia`, returns MP4 bytes; **normalizes** `textSizeScale` and logo offsets before render (see **Render tuning** + **Input normalization**) |
| `src/app/api/render/progress/route.ts` | `GET` — polling progress by `sessionId` (in-memory store) |
| `src/app/api/public-media/route.ts` | Lists scanned `public/` music & backgrounds |
| `src/app/api/brand-logos/[brandId]/route.ts` | Lists logo files per brand folder |
| `src/app/api/gemini/route.ts` | `POST` — proxies a prompt + brand context to **Gemini 2.5 Flash**; reads `GEMINI_API_KEY` **server-side only** (never `NEXT_PUBLIC_*`) |
| `src/remotion/index.ts` | Remotion bundle **entry** — `registerRoot(RemotionRoot)` |
| `src/remotion/Root.tsx` | Three `<Composition>` definitions + default props |
| `src/remotion/*-template.tsx` | **BeforeAfter**, **SingleImage**, **Carousel** scene components |
| `src/remotion/webpack-override.ts` | Webpack alias `@` → `src` for the Remotion bundler (mirrors `tsconfig` paths) |
| `src/remotion/price-tag-badge.tsx` | Pill UI for optional price line |
| `src/config/brands.ts` | Brand ids, display names, logo folders under `public/` |
| `src/config/service-fonts.ts` | Service/headline font ids and defaults |
| `src/config/template-modes.ts` | Template mode ids ↔ composition ids |
| `src/config/video-duration.ts` | Duration clamping / frames |
| `src/config/video-text-scale.ts` | Min/max/default and `clampVideoTextSizeScale` for on-video typography |
| `src/config/logo-offset.ts` | Min/max/step and `clampLogoOffset` for logo `translate` nudge (px) |
| `src/config/background-music.ts` | URL helpers for `public/` assets |
| `src/components/VideoPreview.tsx` | `<Player>` per mode; **key** includes font ids, `textSizeScale`, and logo offsets so the player remounts when those change |
| `src/components/VideoTextSizeSlider.tsx` | Range control in step 5 — scales all template text (preview + export) |
| `src/components/LogoPositionControls.tsx` | Horizontal/vertical sliders in step 2 — disabled when logo hidden |
| `src/components/RenderAndDownload.tsx` | Export button, progress bar, errors, link to Facebook Pages dashboard |
| `src/components/MediaUploader.tsx` | Dropzone + preview + **Crop & position** (opens `ImageCropModal`) |
| `src/components/AiCopyAssistant.tsx` | **AI copy** section — editable `brand_context` textarea + prompt + generate (Gemini) + **Copy** button |
| `src/lib/brand-context.ts` | Firestore helpers for `brandContexts/{brandId}` (`getBrandContext`, `saveBrandContext`, `subscribeBrandContext`) |
| `src/components/ImageCropModal.tsx` | `react-easy-crop` modal; outputs JPEG via `getCroppedImageBlob` |
| `src/components/CarouselSlidesEditor.tsx` | Per-slide image + title; uses `MediaUploader` |
| `src/lib/get-cropped-image.ts` | Canvas export from crop pixels (max dimension 1920) |
| `src/lib/render-progress-store.ts` | Session progress for export (same Node process as API) |
| `src/lib/render-error.ts` | User-facing render error messages (SIGKILL, module missing, etc.) |
| `src/lib/render-environment.ts` | Blocks export on Vercel/Netlify serverless unless escape hatch env |
| `src/lib/simulated-auth.ts` | Simulated sign-in gate (localStorage) |
| `Dockerfile` | Production image: FFmpeg, Chrome libs, Next standalone, **full `node_modules` + `src/` + `public/`**, `ensureBrowser()` in runner |
| `railway.toml` | Force `DOCKERFILE` builder; deploy restart policy |
| `docs/deployment.md` | Long-form: why Docker, Railway checklist, OOM/thread notes, troubleshooting |
| `scripts/verify-remotion.ts` | Bundles Remotion entry without `next build` — run `npm run verify:remotion` |
| `public/` | Static assets: `assets/logos/<brand-id>/`, optional `backgrounds/`, `music/` |
| `public/VideoComposerInstruction.json` | **AI agent instructions** (JSON): app flow, APIs, template rules, deployment notes; served at **`/VideoComposerInstruction.json`** |
| `src/components/AiAgentsInstructionFab.tsx` | Floating **bottom-right** control — opens the instruction JSON in a new browser tab (shown after auth gate, `z-index` above sign-in overlay) |

## AI agent instructions

- **File:** `public/VideoComposerInstruction.json` (same content must live under `public/` so Next.js serves it).
- **Humans** use this **`context.md`** for prose; **agents** can load the JSON for structured fields (routing, auth, export steps, `templateModes`, API list, Remotion paths).
- The JSON includes **`mediaSourcingForAgents`**: if there is no local media, agents may search the web (e.g. Google Images with usage-rights filters, stock sites), **download** files, then upload through the dashboard—the app does not fetch remote media automatically. Users remain responsible for **licensing** of all assets in exports.

## Remotion compositions

Registered in `src/remotion/Root.tsx`:

- **`BeforeAfter`** — `before-after-template.tsx`
- **`SingleImage`** — `single-image-template.tsx`
- **`Carousel`** — `carousel-template.tsx`

Each template receives **input props** from the dashboard (brand id, images as data URLs or paths, colors, fonts, duration, optional subtitle, optional price tag, **`textSizeScale`** for unified text sizing, **`logoOffsetXPx` / `logoOffsetYPx`** for nudging the circular logo, etc.). Composition duration is driven by `calculateMetadata` + user duration controls where applicable. Default props in `Root.tsx` include `textSizeScale: 1` and logo offsets `0`.

## Export pipeline

1. Client generates a **`sessionId`** and polls `GET /api/render/progress?sessionId=…`.
2. Client `POST /api/render` with `{ compositionId, inputProps, sessionId }`.
3. Server **`bundle()`** once (cached) from `src/remotion/index.ts` using `remotionWebpackOverride` for `@/` imports.
4. **`selectComposition`** + **`renderMedia`** with **`onProgress`** updating the progress store.
5. Response: **MP4** binary (`video/mp4`), or JSON **`{ error }`** on failure.

**Note:** Progress storage is **in-memory** — reliable when a single Node process handles both routes (`next dev` / `next start`). Serverless multi-instance setups may not show accurate progress.

### Input normalization (`src/app/api/render/route.ts`)

Before `selectComposition` / `renderMedia`, **`normalizeRenderInputProps`** clamps:

- **`textSizeScale`** — same range as `src/config/video-text-scale.ts` (missing or non-number → default `1`).
- **`logoOffsetXPx` / `logoOffsetYPx`** — same range as `src/config/logo-offset.ts` (missing or non-number → `0`).

This keeps server renders stable if clients send out-of-range or partial payloads.

### Render tuning (`src/app/api/render/route.ts`)

Tuned for **low RAM** hosts (e.g. small containers):

- **`concurrency: 1`**
- **`disallowParallelEncoding: true`** — avoids Chrome + FFmpeg peak RAM overlap
- **`ffmpegOverride`** — appends **`-threads 4`** so libx264 does not spawn dozens of threads (OOM risk)
- **`chromiumOptions`**: `disableWebSecurity`, `enableMultiProcessOnLinux: false`

Do **not** pass arbitrary Chrome **`args`** on `ChromiumOptions` — Remotion’s types do not support it.

### Production Docker

Next **`standalone`** output does not include all of **`src/remotion/`** or the full **`node_modules`** graph the bundler needs. The **`Dockerfile`** copies **standalone `.next`**, **`public/`**, full **`node_modules`** from `npm ci`, and **`src/`** + **`tsconfig.json`**, then runs **`ensureBrowser()`** in the **runner** stage (after FFmpeg + system libs are installed). Deploy with **Docker**, not Railpack-only Node builds.

See **`docs/deployment.md`** for Railway, OOM, and stale-deploy issues.

## Image crop (dashboard)

After upload, **Crop & position** opens **`ImageCropModal`**: pan/zoom, aspect presets (default **9:16**). **Apply** replaces the file with a JPEG (max long side **1920**). **`MediaUploader`** accepts `sourceFile` for naming; `enableCrop` / `cropAspect` optional.

## Verification

- **`npm run verify:remotion`** — ensures the Remotion bundle compiles (independent of Next.js).
- **`npm run verify`** — `verify:remotion` + `lint` + `build`.

## Path alias

- TypeScript: `@/*` → `src/*` (`tsconfig.json`).
- Remotion bundler: same mapping via `src/remotion/webpack-override.ts` (required for `/api/render` and `verify:remotion`).

## UX details (dashboard)

- **Brand title** = `brand.displayName` (from `src/config/brands.ts`); optional **subtitle** and **price tag** below the image area; spacing/size tuned in templates + `price-tag-badge.tsx`.
- **Video text size** — step **5. Text & fonts**, `VideoTextSizeSlider`: one scale for headline, subtitle, price tag, service line, and carousel titles (templates multiply base `fontSize` values).
- **Logo position** — step **2. Logo**, `LogoPositionControls`: pixel offsets applied via CSS `translate` on the logo wrapper (before/after keeps vertical centering with `calc(-50% + y)`); controls disabled when **Show logo** is off.
- **Simulated sign-in** modal (password in `src/lib/simulated-auth.ts`).
- **Instruction for AI Agents** — floating button (`AiAgentsInstructionFab`) opens **`/VideoComposerInstruction.json`** in a new tab.
- **Export** includes render progress UI and parsed error messages.
- Secondary link **“Go to Facebook Pages”** → `https://wizards-dashboard.vercel.app/facebook.html` (in `RenderAndDownload.tsx`).

## Related config

- `next.config.ts` — `transpilePackages` for Remotion; `serverExternalPackages` for bundler/renderer tooling; `output: "standalone"`.

---

## Quick navigation

- **Architecture diagram** (Mermaid): [`docs/architecture.mmd`](docs/architecture.mmd) — classes, composition IDs, and data flow.
- **Code index** (grep-friendly): [`grep/`](grep/) — pre-built `file:line` indexes of exports, types, components, API routes, fetch calls, client boundaries, and a cheatsheet.
- **Shared media library (Firebase)**: [`docs/media-library-setup.md`](docs/media-library-setup.md) — env vars, Firestore/Storage rules, schema, and operational notes.

## AI copy assistant (Gemini + Firebase)

The last left-column section — **AI copy** — generates Facebook / Instagram captions per brand.

- **Brand context** — free-form plaintext stored at Firestore `brandContexts/{brandId}` (`{ brandId, text, updatedAt }`). Edited in-app, live-synced via `onSnapshot`, clamped to **8 000 chars** (`BRAND_CONTEXT_MAX_CHARS` in `src/lib/brand-context.ts`).
- **Prompt + Generate** — posts `{ brandName, brandContext, userPrompt }` to `POST /api/gemini`, which calls **Gemini 2.5 Flash** (`generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`). The server injects a system-style preamble instructing Gemini to output plain-text captions with a hook, message, CTA, and hashtags.
- **Copy button** — writes the output to the clipboard via `navigator.clipboard.writeText`. No dashboard state is mutated (the caption is copy-paste-only; videos are rendered separately).
- **Key is server-only** — `GEMINI_API_KEY` is read inside the API route and **must not** be prefixed `NEXT_PUBLIC_*`. Setting it as a `NEXT_PUBLIC_*` var would inline it into every visitor's browser bundle.
- **Opt-out** — missing `GEMINI_API_KEY` → `/api/gemini` returns **503** with a configuration error; missing Firebase → the panel shows the "Firebase not configured" notice (same as the media library).

## Shared media library (Firebase)

Optional feature enabled by setting `NEXT_PUBLIC_FIREBASE_*` env vars (see `.env.example`). Adds a new accordion step (**2. Brand media library**) where photos can be bulk-uploaded once to a Firestore-backed library keyed by `brandId`; every `MediaUploader` then gets a **Pick from library** button and the carousel editor gets **+ Bulk add from library**.

- **Data plane:** browser-direct — `firebase/firestore` + `firebase/storage`, no server route. Firestore collection `media/{mediaId}` partitioned by `brandId`; Storage objects at `brands/{brandId}/{mediaId}.{ext}`.
- **Key modules:** `src/lib/firebase.ts` (lazy singletons, `isFirebaseConfigured()`), `src/lib/media-library.ts` (`subscribeLibraryMedia`, `uploadLibraryMedia`, `deleteLibraryAsset`, `libraryAssetToFile`).
- **UI:** `BrandMediaLibrary` (dropzone + grid + delete), `MediaLibraryPicker` (single/multi-select modal).
- **Pipeline:** picks are `fetch`-ed to a `Blob` and wrapped as a `File`, feeding the **existing** `onFile → fileToDataUrl → Remotion` path — no changes to `/api/render`.
- **Opt-out:** if env vars are missing, `isFirebaseConfigured()` is false, the library step shows a configuration notice, and the picker buttons are hidden.

## Dashboard state (source of truth: `src/app/dashboard-client.tsx`)

The dashboard is the single stateful client component. Every other component below `dashboard-client.tsx` is controlled — it takes current values as props and calls setter callbacks. High-level state groups:

- **Template & brand** — `templateMode` (`TemplateModeId`), `activeBrandId`, `openLeftStepId` (which accordion is expanded).
- **Uploaded media** — `beforeFile`/`beforeUrl`, `afterFile`/`afterUrl`, `singleFile`/`singleUrl`, `carouselSlides` (`CarouselSlideDraft[]`), `logoFile`.
- **Visual toggles & position** — `showLogo`, `showBeforeAfterArrow`, `logoOffsetXPx`, `logoOffsetYPx`.
- **Typography & text** — `headlineColorHex`, `captionColorHex`, `serviceTitle`, `subtitleText`, `showPriceTag`, `priceTagText`, `brandTitleFontId`, `serviceFontId`, `textSizeScale`.
- **Timing & media paths** — `durationSeconds`, `backgroundPath`, `musicPath`.
- **Runtime / UI** — `mediaLoading`, `scannedMedia`, `isRendering`, `previewAccordionOpen`, `simulatedAuthReady`, `simulatedSignedIn`.

Template input props (`beforeAfterProps`, `singleImageProps`, `carouselProps`) are derived via `useMemo`. Those same objects feed the live `<Player>` and the `POST /api/render` payload — guaranteeing preview parity.

## Step accordion

Steps rendered via `DashboardStepAccordion` (numbered cards with accent colors). Step ids and the components they host:

| # | Step | Component(s) |
|---|------|--------------|
| 1 | Layout | `TemplateModeToggle` |
| 2 | Brand | `BrandSelector` |
| 3 | Logo | `LogoPicker` + `LogoPositionControls` (+ show/hide) |
| 4 | Video text colors | `VideoTextColors` |
| 5 | Background & music | `BackgroundMusicControls` |
| 6 | Text & fonts | `ServiceFontPicker`, subtitle/price inputs, `VideoTextSizeSlider` |
| 7 | Video length | `VideoDurationControl` |
| 8 | Photos | `MediaUploader` ×N (or `CarouselSlidesEditor` for carousel) |
| — | Export | `RenderAndDownload` |
| — | Preview | `VideoPreview` |

## Component catalog

| Component | Props (summary) | Role |
|-----------|-----------------|------|
| `DashboardStepAccordion` | `{ id, title, accent, openId, onOpenChange, children }` | Collapsible step card; 9 accent palettes. |
| `BrandSelector` | `{ brands, activeBrandId, onSelect }` | Grid of brand buttons; active is highlighted. |
| `TemplateModeToggle` | `{ value, onChange }` | 3-way mode switch. |
| `LogoPicker` | `{ brand, value, onChange }` | Fetches `/api/brand-logos/[brandId]`, shows dropdown + preview, persists per-brand selection in `localStorage` (`LOGO_STORAGE_PREFIX`). |
| `LogoPositionControls` | `{ offsetXPx, offsetYPx, onOffsetXChange, onOffsetYChange, disabled? }` | X/Y sliders, reset button. |
| `MediaUploader` | `{ label, description, imageSrc, onFile, sourceFile?, enableCrop?, cropAspect? }` | Dropzone + preview + "Crop & position" button. |
| `ImageCropModal` | `{ open, imageSrc, onClose, onApply, fileNameHint?, defaultAspect? }` | `react-easy-crop` → `getCroppedImageBlob` → JPEG. |
| `CarouselSlidesEditor` | `{ slides, onChange }` | Up to `MAX_CAROUSEL_SLIDES` rows; each has title + `MediaUploader`. |
| `BackgroundMusicControls` | `{ backgroundOptions, musicOptions, backgroundPath, musicPath, onBackgroundChange, onMusicChange, mediaLoading }` | Two selects for public-asset paths. |
| `ServiceFontPicker` | `{ value, onChange, label?, description? }` | Service/headline font id picker. |
| `VideoTextColors` | `{ headlineColorHex, captionColorHex, defaultHeadlineHex, onHeadlineChange, onCaptionChange }` | Native color inputs + hex fields + reset. |
| `VideoDurationControl` | `{ durationSeconds, onChange }` | Clamped seconds slider. |
| `VideoTextSizeSlider` | `{ value, onChange }` | Unified scale (65–165 %). |
| `VideoPreview` | `{ mode, beforeAfterProps, singleImageProps, carouselProps }` | `<Player>` from `@remotion/player`; `key` includes fonts/scale/offsets to force remount. |
| `RenderAndDownload` | `{ disabled, isRendering, compositionId, getInputProps, onBusyChange }` | Orchestrates sessionId, progress polling, `POST /api/render`, MP4 download. |
| `SignInModal` | `{ onSuccess }` | Simulated auth gate. |
| `AiAgentsInstructionFab` | — | Floating button → opens `/VideoComposerInstruction.json`. |
| `ThemeProvider` / `ThemeToggle` | — | `next-themes` wrapper + toggle. |

## Remotion templates — input props

All three share the **common block**:

```
brandId, titleText, subtitleText,
showPriceTag, priceTagText,
bgSrc, musicSrc,
logoSrc, showLogo,
headlineColorHex, captionColorHex,
brandTitleFontId, serviceFontId,
durationInFrames, textSizeScale,
logoOffsetXPx, logoOffsetYPx
```

Mode-specific additions:

| Composition (id) | Extra input props |
|------------------|-------------------|
| `BeforeAfter` | `topImageSrc`, `bottomImageSrc`, `showArrow`, `serviceTitle` |
| `SingleImage` | `imageSrc`, `serviceTitle` |
| `Carousel` | `slides: CarouselSlide[]` (`{ imageSrc, title }`) — duration scales with `CAROUSEL_FRAMES_PER_SLIDE` (45 @ 30 fps) |

Image sources are normally **data URLs** (from `fileToDataUrl` / crop blob) for dashboard renders; `resolveMediaSrc` in `src/remotion/media-utils.ts` passes `data:` / `blob:` / `http(s)` through and routes plain paths to `staticFile()` for `public/` assets.

## API surface

| Method & path | Request | Response | Notes |
|---------------|---------|----------|-------|
| `POST /api/render` | `{ compositionId, inputProps, sessionId? }` | `video/mp4` binary or `{ error }` | Validates inputs; runs `bundle()` (cached) + `selectComposition` + `renderMedia`; low-RAM tuning (see below). |
| `GET /api/render/progress?sessionId=` | — | `{ progress, label, active }` | In-memory store; single Node process. |
| `GET /api/public-media` | — | `{ music: MediaAsset[], backgrounds: MediaAsset[] }` | Calls `scanPublicMedia()` + merges static config. |
| `GET /api/brand-logos/[brandId]` | — | `{ files, folder }` | Reads `public/assets/logos/<brandId>/` and filters image extensions. |
| `POST /api/gemini` | `{ brandName, brandContext, userPrompt }` | `{ text }` or `{ error }` | Calls **Gemini 2.5 Flash** (`generativelanguage.googleapis.com`). Reads `GEMINI_API_KEY` from server env — never exposed to the browser. |

## End-to-end data flow

```
User input (form controls)
   │
   ▼
DashboardClient state ── useMemo ──▶ {beforeAfterProps, singleImageProps, carouselProps}
   │                                           │
   │ (live)                                    │ (export)
   ▼                                           ▼
VideoPreview <Player>         RenderAndDownload
                                │
                                │  getInputProps()  ── File → data URL
                                ▼
                             POST /api/render  {compositionId, inputProps, sessionId}
                                │                       ▲
                                │                       │  polling (every 400 ms)
                                │                       │
                                ▼                 GET /api/render/progress
                          normalizeRenderInputProps
                                │   (clamps textSizeScale + logoOffsets)
                                ▼
                          bundle(src/remotion/index.ts)   — cached
                                │
                                ▼
                          selectComposition(compositionId)
                                │
                                ▼
                          renderMedia(
                            onProgress → setRenderProgress(sessionId, ...)
                            concurrency: 1,
                            disallowParallelEncoding: true,
                            ffmpegOverride: -threads 4,
                            chromiumOptions: { disableWebSecurity, enableMultiProcessOnLinux: false }
                          )
                                │
                                ▼
                          MP4 bytes ── Response (video/mp4) ── browser download
```

## Key type catalog

| Type | File | Used by |
|------|------|---------|
| `Brand` | `src/config/brands.ts` | `BrandSelector`, `LogoPicker`, `brandLogoPublicUrl` |
| `TemplateModeId` | `src/config/template-modes.ts` | dashboard, `TemplateModeToggle`, `templateModeToCompositionId` |
| `RemotionCompositionId` | `src/remotion/composition-ids.ts` | `Root.tsx`, `/api/render` (`selectComposition`) |
| `ServiceFontId` | `src/config/service-fonts.ts` | `ServiceFontPicker`, `SERVICE_FONT_CSS`, template text styles |
| `BeforeAfterTemplateProps` | `src/remotion/before-after-template.tsx` | `Root.tsx` defaults, `VideoPreview`, `/api/render` |
| `SingleImageTemplateProps` | `src/remotion/single-image-template.tsx` | same |
| `CarouselTemplateProps` | `src/remotion/carousel-template.tsx` | same |
| `CarouselSlide` / `CarouselSlideDraft` | `carousel-template.tsx` / `src/lib/carousel-slides.ts` | `CarouselSlidesEditor` (draft) → render props (slide) |
| `MediaAsset` | `src/config/background-music.ts` | `BackgroundMusicControls`, `/api/public-media` |
| `RenderProgressSnapshot` | `src/lib/render-progress-store.ts` | `/api/render` (write), `/api/render/progress` (read), `RenderAndDownload` (display) |
| `UiLayerMotion` | `src/remotion/ui-motion.ts` | Templates' staggered enter/exit animations |
| `AccordionAccent` | `src/components/DashboardStepAccordion.tsx` | All step cards |
| `CroppedImageOptions` | `src/lib/get-cropped-image.ts` | `ImageCropModal` JPEG export |

## Environment & persistence

- **`NEXT_PUBLIC_*` (e.g. Firebase)** — Inlined at **`next build`**. For **Docker** deploys (Railway), the `Dockerfile` **`builder`** stage declares matching **`ARG` / `ENV`** so Railway build-args reach `npm run build`. Railway variables must be enabled for the **build** step, not only runtime — see **`docs/deployment.md`**.
- **Serverless gate** — `src/lib/render-environment.ts` returns a block message on `VERCEL` or `NETLIFY`; escape hatch `REMOTION_ALLOW_EXPORT_ON_SERVERLESS=1`.
- **Bundle cache** — `/api/render` keeps a single `bundle()` result alive per process.
- **Progress store** — in-memory `Map<sessionId, RenderProgressSnapshot>`; works only when the same Node process serves both `/api/render` and `/api/render/progress` (so: `next dev`, `next start`, or a single Docker container — not multi-instance serverless).
- **Browser localStorage** — `video-composer-simulated-auth` (auth gate), `video-composer-logo:<brandId>` (last-picked logo).
- **Assets on disk** — `public/assets/logos/<brandId>/…`, `public/music/…`, `public/background-videos/…`; scanned dirs listed in `MUSIC_SCAN_DIRS` / `BACKGROUND_SCAN_DIRS`.

## Production render tuning (`src/app/api/render/route.ts`)

Already called out above; one-line reminder: `concurrency: 1`, `disallowParallelEncoding: true`, `ffmpegOverride` appends `-threads 4`, `chromiumOptions.enableMultiProcessOnLinux: false`. Do **not** pass arbitrary Chrome `args` via `ChromiumOptions` — unsupported by Remotion's types.
