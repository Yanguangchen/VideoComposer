# Deployment & export (production)

This app renders MP4s **on the server** using Remotion (`bundle` → headless Chrome → FFmpeg). That is **not** the same as a typical Next.js API route: it needs **CPU**, **RAM**, **FFmpeg**, **Chrome Headless Shell**, and **your Remotion source** available at runtime.

## Why Docker?

Next.js `output: "standalone"` only traces what the server bundle imports. Remotion’s **`bundle()`** compiles `src/remotion/` **at request time** and pulls in packages like `remotion`, `@remotion/google-fonts/*`, etc. The production image therefore **must** include:

| Path | Reason |
|------|--------|
| `.next/standalone` + `.next/static` | Next.js server |
| `public/` | Assets referenced by compositions |
| Full `node_modules/` (from `npm ci`) | Runtime Remotion webpack bundler + fonts |
| `src/remotion/`, `src/config/`, `src/lib/` as needed | Source for `bundle()` entry (`src/remotion/index.ts`) |
| `tsconfig.json` | `@/` path alias for the bundler |

The `Dockerfile` in this repo encodes that layout. **Do not** deploy with Railpack/Nixpacks-only builds if you need export — they won’t match this.

## Railway

### Environment variables and Docker builds

**Symptom:** Firebase (or any `NEXT_PUBLIC_*` feature) works locally with `.env.local` but on Railway the app acts like the variables are missing.

**Cause (two parts):**

1. **`NEXT_PUBLIC_*` is compile-time** — Next.js inlines these into the client JS at **`next build`**, which runs in the **`builder`** stage of the `Dockerfile`, not when the container starts.
2. **Docker + Railway** — Railway passes your service variables into `docker build`, but Docker **only exposes them to `RUN` lines if you declare `ARG`** (see [Railway — Dockerfiles, build-time variables](https://docs.railway.com/builds/dockerfiles#using-variables-at-build-time)). This repo’s `Dockerfile` declares **`ARG` + `ENV`** for the Firebase web config keys before `RUN npm run build`.

**What you must do in Railway:**

1. **Variables tab:** define the same names as locally (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, …). Railway makes service variables available to the build by default.
2. **Redeploy** after adding or changing them so `npm run build` runs again. If the site still shows “Firebase not configured”, trigger a **redeploy without build cache** so an old layer is not reused from a build that ran with empty values.

Variables **without** the `NEXT_PUBLIC_` prefix are read at **runtime** by `node server.js` only; they do not need to be in the `builder` stage unless something in `next build` reads them (rare).

### Builder

New Railway services often default to **Railpack** (Node only). That image has **no system FFmpeg** and no Chrome libs. This repo includes **`railway.toml`** with `builder = "DOCKERFILE"` so Railway runs **`docker build`**.

After connecting the repo:

1. Confirm the service **branch** is **`main`** (or the branch you actually push to).
2. In the deployment details, confirm the **commit SHA** matches GitHub (stale deploys are a common cause of “works locally, fails in CI”).
3. Build logs should show a **Dockerfile** build, not only Railpack.

### Memory (OOM)

Video export uses **Chrome** (frames) + **FFmpeg** (encode). On small instances, the **OOM killer** can terminate FFmpeg (`SIGKILL`) or the whole Node process (**502** / **Failed to fetch**).

Mitigations used in code:

- **`concurrency: 1`** — one render tab at a time.
- **`disallowParallelEncoding: true`** — avoid encoding while still rendering frames (lowers peak RAM).
- **`ffmpegOverride`** appends **`-threads 4`** so libx264 does not auto-spawn dozens of threads (which can blow RAM on high-CPU hosts).

You should still use a plan with **enough RAM** for 1080×1920 @ 30fps (often **1–2 GB+** depending on composition). Check **Metrics** in Railway while exporting.

### Timeouts

Long renders can exceed proxy or client timeouts. Slower settings (above) trade speed for stability. If exports abort with **Failed to fetch**, check whether the request duration exceeds your host’s limit.

## Local development vs production

| | Local (`next dev`) | Docker / Railway |
|--|-------------------|-------------------|
| FFmpeg | Install on **PATH** | Installed in image (`apt`) |
| Chrome | `ensureBrowser()` may download under project | Pre-run in Dockerfile build step |
| Bundling | Same `/api/render` flow | Same, but image must include `src/` + full `node_modules` |

## Serverless (Vercel / Netlify)

Export is **blocked** by default when `VERCEL` or `NETLIFY` is detected (no FFmpeg/Chrome in that model). Preview in the browser can still work; MP4 export needs Docker, a VPS, or a service like **Remotion Lambda**.

## Troubleshooting quick reference

| Symptom | Likely cause |
|--------|----------------|
| `Can't resolve './Root'` or `@remotion/google-fonts/...` | Image missing `src/` or full `node_modules` — use this repo’s Dockerfile as-is. |
| `FFmpeg quit ... SIGKILL` | OOM — increase RAM, or rely on thread cap + concurrency settings already in `/api/render`. |
| **502** / **Failed to fetch** | Process killed (OOM) or request timeout; check Railway logs and metrics. |
| Build fails with old `chromiumOptions.args` | Wrong branch or stale deploy — confirm GitHub commit on the deployment. |
| “FFmpeg or browser missing” but logs show SIGKILL | See `formatRenderError` in `src/lib/render-error.ts` — prefer server logs for ground truth. |

## Related files

- `Dockerfile` — image layout and `ensureBrowser()` at build time  
- `railway.toml` — Railway builder + deploy restart policy  
- `src/app/api/render/route.ts` — `renderMedia` options (concurrency, FFmpeg override); **`normalizeRenderInputProps`** clamps `textSizeScale` and logo offset fields on the JSON body before render (see `src/config/video-text-scale.ts`, `src/config/logo-offset.ts`)  
- `src/lib/render-environment.ts` — serverless export block  
- `src/lib/render-error.ts` — user-facing error strings  
- `context.md` — full dashboard/remotion file map and export pipeline details  
