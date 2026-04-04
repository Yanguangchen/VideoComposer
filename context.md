# Video Composer — project context

## Purpose

A **Next.js** dashboard to build **multi-brand marketing videos**: pick a template (before/after, single image, or carousel), choose a brand and assets, preview with **Remotion Player**, and **export MP4** via a server-side render route.

## Stack

- **Next.js 15** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS** for the dashboard UI
- **Remotion 4** — compositions in `src/remotion/`, preview with `@remotion/player`, export with `@remotion/renderer` + `@remotion/bundler`
- **Google Fonts** — loaded in `src/app/layout.tsx` via `<link>` (`src/config/google-fonts.ts`); templates also preload via `@remotion/google-fonts` in `src/remotion/service-font-loaders.ts`

## Directory map

| Path | Role |
|------|------|
| `src/app/page.tsx` | Server page; renders `DashboardClient` |
| `src/app/dashboard-client.tsx` | Main client UI: brand, logos, media, text, fonts, duration, preview, export |
| `src/app/layout.tsx` | Root layout; global Google Fonts stylesheet link |
| `src/app/globals.css` | Tailwind entry (`@tailwind` only; no font `@import`) |
| `src/app/api/render/route.ts` | `POST` — bundles Remotion, `renderMedia`, returns MP4 bytes |
| `src/app/api/render/progress/route.ts` | `GET` — polling progress by `sessionId` (in-memory store) |
| `src/app/api/public-media/route.ts` | Lists scanned `public/` music & backgrounds |
| `src/app/api/brand-logos/[brandId]/route.ts` | Lists logo files per brand folder |
| `src/remotion/index.ts` | Remotion bundle **entry** — `registerRoot(RemotionRoot)` |
| `src/remotion/Root.tsx` | Three `<Composition>` definitions + default props |
| `src/remotion/*-template.tsx` | **BeforeAfter**, **SingleImage**, **Carousel** scene components |
| `src/remotion/webpack-override.ts` | Webpack alias `@` → `src` for the Remotion bundler (mirrors `tsconfig` paths) |
| `src/config/brands.ts` | Brand ids, display names, logo folders under `public/` |
| `src/config/service-fonts.ts` | Service/headline font ids and defaults |
| `src/config/template-modes.ts` | Template mode ids ↔ composition ids |
| `src/config/video-duration.ts` | Duration clamping / frames |
| `src/config/background-music.ts` | URL helpers for `public/` assets |
| `src/components/VideoPreview.tsx` | `<Player>` per mode; **key** includes font ids to remount on font change |
| `src/components/RenderAndDownload.tsx` | Export button, progress bar, errors, link to Facebook Pages dashboard |
| `src/lib/render-progress-store.ts` | Session progress for export (same Node process as API) |
| `src/lib/render-error.ts` | User-facing render error messages |
| `scripts/verify-remotion.ts` | Bundles Remotion entry without `next build` — run `npm run verify:remotion` |
| `public/` | Static assets: `assets/logos/<brand-id>/`, optional `backgrounds/`, `music/` |

## Remotion compositions

Registered in `src/remotion/Root.tsx`:

- **`BeforeAfter`** — `before-after-template.tsx`
- **`SingleImage`** — `single-image-template.tsx`
- **`Carousel`** — `carousel-template.tsx`

Each template receives **input props** from the dashboard (brand id, images as data URLs or paths, colors, fonts, duration, optional subtitle, optional price tag, etc.). Composition duration is driven by `calculateMetadata` + user duration controls where applicable.

## Export pipeline

1. Client generates a **`sessionId`** and polls `GET /api/render/progress?sessionId=…`.
2. Client `POST /api/render` with `{ compositionId, inputProps, sessionId }`.
3. Server **`bundle()`** once (cached) from `src/remotion/index.ts` using `remotionWebpackOverride` for `@/` imports.
4. **`selectComposition`** + **`renderMedia`** with **`onProgress`** updating the progress store.
5. Response: **MP4** binary (`video/mp4`), or JSON **`{ error }`** on failure.

**Note:** Progress storage is **in-memory** — reliable when a single Node process handles both routes (`next dev` / `next start`). Serverless multi-instance setups may not show accurate progress.

## Verification

- **`npm run verify:remotion`** — ensures the Remotion bundle compiles (independent of Next.js).
- **`npm run verify`** — `verify:remotion` + `lint` + `build`.

## Path alias

- TypeScript: `@/*` → `src/*` (`tsconfig.json`).
- Remotion bundler: same mapping via `src/remotion/webpack-override.ts` (required for `/api/render` and `verify:remotion`).

## UX details (dashboard)

- **Brand title** = `brand.displayName`; optional **subtitle** and **price tag** appear **below the image area** in templates.
- **Export** includes render progress UI and parsed error messages.
- Secondary link **“Go to Facebook Pages”** → `https://wizards-dashboard.vercel.app/facebook.html` (in `RenderAndDownload.tsx`).

## Related config

- `next.config.ts` — `transpilePackages` for Remotion; `serverExternalPackages` for bundler/renderer tooling.
