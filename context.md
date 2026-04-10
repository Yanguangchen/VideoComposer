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
