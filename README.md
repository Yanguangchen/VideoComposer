# Video Composer

Next.js dashboard for multi-brand **Before / After** marketing videos: pick a client, upload two photos, preview a themed Remotion template, and export an MP4.

## Stack

- **Next.js 15** (App Router) + **Tailwind CSS**
- **Remotion** — `@remotion/player` (preview), `@remotion/bundler` + `@remotion/renderer` (server render via `/api/render`)
- **react-dropzone** — drag-and-drop uploads with `URL.createObjectURL` previews

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Export (MP4)

Export runs **on the server** (`npm run dev` / `next start`), not inside Brave, Chrome, or any other browser tab. Remotion uses **FFmpeg** plus a **headless Chromium** bundle for frames.

### Windows

1. **FFmpeg** must be on your `PATH` (the terminal that runs Next.js must find `ffmpeg`).
   - Example: `winget install Gyan.FFmpeg` (or install from [ffmpeg.org](https://ffmpeg.org/download.html) and add `bin` to PATH).
   - Open a **new** terminal, run `ffmpeg -version`, then `npm run dev`.
2. **Headless browser**: the first export calls Remotion’s `ensureBrowser()`, which may download Chrome Headless Shell under `node_modules` (can take a minute). You can also pre-download with: `npx remotion browser ensure`.

### General

- See [Remotion — FFmpeg](https://www.remotion.dev/docs/miscellaneous/ffmpeg) and [Chrome Headless Shell](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell).

### Production deployment (export must work)

**Vercel / Netlify serverless** do not provide FFmpeg or a full headless Chrome for Remotion. The `/api/render` route returns **503** with an explanation when `VERCEL` or `NETLIFY` is set. Preview in the browser still works; **MP4 export requires a different host** (or [Remotion Lambda](https://www.remotion.dev/docs/lambda)).

**Recommended:** run the app in **Docker** on [Railway](https://railway.app/), [Fly.io](https://fly.io/), [Render](https://render.com/), a VPS, or any host that runs containers with FFmpeg + OS libraries installed.

```bash
docker build -t video-composer .
docker run -p 3000:3000 video-composer
```

The repo `Dockerfile` installs **FFmpeg** and **Debian libraries** required by Remotion’s Chrome Headless Shell ([Linux deps](https://www.remotion.dev/docs/miscellaneous/linux-dependencies)). Build uses Next.js **`output: "standalone"`**.

#### Railway (quick start)

1. Push this repo to **GitHub** (or GitLab / Bitbucket).
2. Sign up at [railway.app](https://railway.app/) and click **New Project** → **Deploy from GitHub repo** → choose **VideoComposer** (install the Railway GitHub app if asked).
3. **Important:** New Railway services default to **Railpack** (Node-only) — that has **no FFmpeg**, so export fails. This repo includes **`railway.toml`** with `builder = "DOCKERFILE"` so builds use the **`Dockerfile`**. Pull the latest code, redeploy, and confirm build logs show **`docker build`**, not only Railpack. If needed: service → **Settings** → set builder to **Dockerfile** / path `Dockerfile`.
4. Wait for the build to finish. Railway assigns a **public URL** on the **Networking** / **Settings** tab (you may need to click **Generate domain**).
5. Open that URL in a browser. The first **Export MP4** may take longer while Remotion downloads Chrome Headless Shell into the container’s disk.
6. **Optional:** under **Variables**, add any app secrets later. You usually do **not** need to set `PORT` — Railway sets it; Next.js reads it.

**Note:** Free tier limits change over time; check [Railway pricing](https://railway.app/pricing). Video rendering is CPU-heavy — pick a plan with enough RAM (e.g. 2 GB+) if exports fail or time out.

**Escape hatch (not recommended):** set `REMOTION_ALLOW_EXPORT_ON_SERVERLESS=1` only if you have a custom runtime where FFmpeg and the browser actually exist.

Brands are configured in `src/config/brands.ts`. Each brand has a **dedicated logo folder** under `public/assets/logos/<brand-id>/` (e.g. `public/assets/logos/le-motor/logo.png`). Drop files there once; the dashboard lists them and remembers your selection per brand in the browser. Optional backgrounds and music: `public/backgrounds/`, `public/music/`.

## License

MIT
