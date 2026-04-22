# Video Composer

Next.js dashboard for multi-brand **Before / After** (and related) marketing videos: pick a client, upload media, preview a Remotion template, and export an MP4.

## Stack

- **Next.js 15** (App Router) + **Tailwind CSS** + **next-themes** (dark/light)
- **Remotion** — `@remotion/player` (preview), `@remotion/bundler` + `@remotion/renderer` (server render via `POST /api/render`)
- **react-dropzone** — drag-and-drop uploads with `URL.createObjectURL` previews

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Full production deployment notes (Docker, Railway, memory, troubleshooting) are in **[docs/deployment.md](docs/deployment.md)**.

Human-oriented project map, file index, and behavior notes live in **[context.md](context.md)**.

## Dashboard (high level)

- **Brands** — `src/config/brands.ts` (`displayName`, `id`, `logoFolder` under `public/assets/logos/<brand-id>/`).
- **Logo** — pick a file, toggle visibility, **nudge position** (horizontal/vertical px) when the logo is shown.
- **Text** — colors, fonts, optional subtitle/price tag/service line (or carousel captions), and a **single slider** that scales all on-video text.
- **Preview** — Remotion Player; **Export** — `POST /api/render` with the same props as preview (see context.md for normalization).

## How export works

1. The browser sends composition props to **`/api/render`**.
2. The server **bundles** the Remotion project (`src/remotion/`), opens **headless Chrome**, renders frames, and runs **FFmpeg** to produce H.264 MP4.
3. Your desktop browser does **not** run FFmpeg or Chrome for export — it only downloads the finished file.

So export needs **FFmpeg**, **Chrome Headless Shell**, and **Remotion source + node modules** on whatever machine runs `next start` (or your Docker container).

## Export (MP4) — local development

Export runs **on the machine that runs Next.js** (`npm run dev` / `npm run start`), not inside the user’s browser tab.

### Windows

1. Put **FFmpeg** on your `PATH` (the same terminal that runs Next.js must run `ffmpeg -version` successfully).
   - Example: `winget install Gyan.FFmpeg`, or install from [ffmpeg.org](https://ffmpeg.org/download.html) and add `bin` to PATH.
2. Open a **new** terminal, verify `ffmpeg -version`, then `npm run dev`.
3. **Headless Chrome**: the first export may download Chrome Headless Shell (can take a minute). Optional: `npx remotion browser ensure`.

### Docs

- [Remotion — FFmpeg](https://www.remotion.dev/docs/miscellaneous/ffmpeg)
- [Chrome Headless Shell](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell)

## Production deployment

**Vercel / Netlify (default serverless)** do not provide FFmpeg + a full headless Chrome for this workflow. The app returns **503** on `/api/render` when `VERCEL` or `NETLIFY` is set (see `src/lib/render-environment.ts`). In-browser preview can still work; **MP4 export requires a Node + FFmpeg + Chrome environment** (Docker, VPS, etc.), or a separate render service such as [Remotion Lambda](https://www.remotion.dev/docs/lambda).

### Docker (recommended)

```bash
docker build -t video-composer .
docker run -p 3000:3000 -e PORT=3000 video-composer
```

The repo **`Dockerfile`** installs **FFmpeg**, Chrome runtime **libraries**, Next **`standalone`** output, and copies **`src/`** + full **`node_modules/`** so Remotion can bundle at runtime. See **[docs/deployment.md](docs/deployment.md)** for why those copies are required.

### Railway (quick checklist)

1. Connect this **GitHub** repo and deploy from branch **`main`** (or your default branch).
2. Use **Dockerfile** builds — this repo includes **`railway.toml`** with `builder = "DOCKERFILE"`. Build logs should show **`docker build`**, not only Railpack.
3. Confirm each deployment shows the **same commit SHA** as GitHub (avoids stale builds).
4. Allocate **enough RAM** for video export (often **1 GB+**; 1080×1920 is heavy). See metrics in Railway while exporting.
5. **Networking**: generate a public URL if needed. **`PORT`** is set by Railway; do not hardcode it in the image.
6. **`NEXT_PUBLIC_*` (Firebase, etc.):** baked in at **`next build`** inside Docker — add the same names in Railway **Variables** and redeploy. The `Dockerfile` uses **`ARG`/`ENV`** so Docker passes Railway’s values into that build (see **[docs/deployment.md](docs/deployment.md)**). If the app still looks unconfigured, redeploy **without build cache**.

**Escape hatch (not recommended):** `REMOTION_ALLOW_EXPORT_ON_SERVERLESS=1` only if your runtime actually has FFmpeg and Chrome.

## Project layout (selected)

| Path | Purpose |
|------|---------|
| `src/app/api/render/route.ts` | Server-side Remotion render + MP4 response |
| `src/remotion/` | Remotion compositions and entry (`index.ts` → `Root.tsx`) |
| `src/config/brands.ts` | Brand definitions |
| `src/config/video-text-scale.ts` | Clamped scale for all template text |
| `src/config/logo-offset.ts` | Clamped logo `translate` offsets (px) |
| `public/assets/logos/<brand-id>/` | Per-brand logos |
| `public/backgrounds/`, `public/music/` | Optional assets |

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # production server (after build)
npm run lint
npm run verify   # remotion verify + lint + build
```

## License

MIT
