# Deployment & Export (Production)

This app renders MP4s **on the server** using Remotion (`bundle` → headless Chrome → FFmpeg). That is **not** the same as a typical Next.js API route: it needs **CPU**, **RAM**, **FFmpeg**, **Chrome Headless Shell**, and **your Remotion source** available at runtime.

---

## 1. Why Docker?

Next.js `output: "standalone"` only traces what the server bundle imports. Remotion’s **`bundle()`** compiles `src/remotion/` **at request time** and pulls in packages like `remotion`, `@remotion/google-fonts/*`, etc. The production image therefore **must** include:

| Path                                                 | Reason                                                |
| :--------------------------------------------------- | :---------------------------------------------------- |
| `.next/standalone` + `.next/static`                  | Next.js server                                        |
| `public/`                                            | Assets referenced by compositions                     |
| Full `node_modules/` (from `npm ci`)                 | Runtime Remotion webpack bundler + fonts              |
| `src/remotion/`, `src/config/`, `src/lib/` as needed | Source for `bundle()` entry (`src/remotion/index.ts`) |
| `tsconfig.json`                                      | `@/` path alias for the bundler                       |

The `Dockerfile` in this repo encodes that layout. **Do not** deploy with Railpack/Nixpacks-only builds if you need export — they won’t match this.

---

## 2. Railway Deployment Guide

### 2.1 Environment Variables & Docker Builds

**Symptom**: Firebase (or any `NEXT_PUBLIC_*` feature) works locally with `.env.local` but on Railway the app acts like the variables are missing.

**Cause (two parts)**:

1. **`NEXT_PUBLIC_*` is compile-time** — Next.js inlines these into the client JS at **`next build`**, which runs in the **`builder`** stage of the `Dockerfile`, not when the container starts.
2. **Docker + Railway** — Railway passes your service variables into `docker build`, but Docker **only exposes them to `RUN` lines if you declare `ARG`** (see [Railway — Dockerfiles, build-time variables](https://docs.railway.com/builds/dockerfiles#using-variables-at-build-time)). This repo’s `Dockerfile` declares **`ARG` + `ENV`** for the Firebase web config keys before `RUN npm run build`.

**What you must do in Railway**:

1. **Variables tab**: Define the same names as locally (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.). Railway makes service variables available to the build by default.
2. **Redeploy** after adding or changing them so `npm run build` runs again. If the site still shows “Firebase not configured”, trigger a **redeploy without build cache** so an old layer is not reused from a build that ran with empty values.

> [!IMPORTANT]
> Variables **without** the `NEXT_PUBLIC_` prefix are read at **runtime** by `node server.js` only; they do not need to be in the `builder` stage unless something in `next build` reads them. **`GEMINI_API_KEY`** is one of these — set it in Railway **Variables** only; no Dockerfile `ARG` is required. Do **not** rename it to `NEXT_PUBLIC_GEMINI_API_KEY` or the key will ship to every browser.

### 2.2 Builder Selection

New Railway services often default to **Railpack** (Node only). That image has **no system FFmpeg** and no Chrome libs. This repo includes **`railway.toml`** with `builder = "DOCKERFILE"` so Railway runs **`docker build`**.

After connecting the repo:

1. Confirm the service **branch** is **`main`** (or the branch you actually push to).
2. In the deployment details, confirm the **commit SHA** matches GitHub (stale deploys are a common cause of “works locally, fails in CI”).
3. Build logs should show a **Dockerfile** build, not only Railpack.

### 2.3 Memory (OOM) Management

Video export uses **Chrome** (frames) + **FFmpeg** (encode). On small instances, the **OOM killer** can terminate FFmpeg (`SIGKILL`) or the whole Node process (**502** / **Failed to fetch**).

Mitigations used in code:

- **`concurrency: 1`** — one render tab at a time.
- **`disallowParallelEncoding: true`** — avoid encoding while still rendering frames (lowers peak RAM).
- **`ffmpegOverride`** appends **`-threads 4`** so libx264 does not auto-spawn dozens of threads (which can blow RAM on high-CPU hosts).

You should still use a plan with **enough RAM** for 1080×1920 @ 30fps (often **1–2 GB+** depending on composition). Check **Metrics** in Railway while exporting.

---

## 3. Advanced Hosting & Architecture Playbook

### 3.1 Nginx & Reverse Proxy Configuration

Since video rendering runs synchronously on the server during the POST `/api/render` request, rendering times can scale depending on video length and slide counts. If placing this application behind Nginx, HAProxy, or a CDN, you **must** configure timeouts to prevent connection drops.

Example **Nginx** server block config:

```nginx
server {
    listen 80;
    server_name composer.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # CRITICAL: Prevent Gateway Timeout (504) during rendering
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;

        # Allow large asset uploads (e.g. video files, large media library blobs)
        client_max_body_size 120M;
    }
}
```

### 3.2 Cross-Platform Multi-Arch Docker Builds

If building the Docker image locally on an Apple Silicon machine (ARM64) to deploy to an Intel/AMD cloud server (AMD64), Chromium will crash instantly with library architecture faults. Use Docker Buildx to target the destination environment platform during build:

```bash
# Build and push to your container registry targeting AMD64 linux servers
docker buildx build --platform linux/amd64 -t yourregistry/video-composer:latest --push .
```

### 3.3 Disk space and Ephemeral Directories (`/tmp`)

Remotion renders individual frames to the OS temporary directory (`/tmp` on Linux, `AppData\Local\Temp` on Windows).

- Every page render allocates space for temporary `.png` files representing video frames.
- A 5-second 30fps 1080x1920 video generates 150 frames, consuming around **100MB - 300MB** of temporary disk space during compilation.
- The route handler unlinks these files in the `finally` block of `/api/render`. However, if the process is terminated abruptly (e.g. OOM SIGKILL), temp files can build up. If hosting in a non-containerized VM, set up a cron job to clean up stale `/tmp/remotion-*` files older than 24 hours.

---

## 4. Local Development vs Production

| Parameter    | Local (`next dev`)                           | Docker / Railway                                   |
| :----------- | :------------------------------------------- | :------------------------------------------------- |
| **FFmpeg**   | Installed on host **PATH**                   | Installed in image via package manager (`apt-get`) |
| **Chrome**   | `ensureBrowser()` may download under project | Pre-downloaded and baked into image                |
| **Bundling** | Request-time compilation                     | Pre-configured standalone Webpack compile          |
| **Storage**  | Writes to local OS temp                      | Writes to container internal ephemeral `/tmp`      |

---

## 5. Serverless (Vercel / Netlify)

Export is **blocked** by default when `VERCEL` or `NETLIFY` is detected (no FFmpeg/Chrome in that model). Preview in the browser can still work; MP4 export needs Docker, a VPS, or a service like **Remotion Lambda**.

To bypass this restriction (only if your custom serverless environment has FFmpeg and Chromium pre-wired on PATH):

```env
REMOTION_ALLOW_EXPORT_ON_SERVERLESS=1
```

---

## 6. Troubleshooting Quick Reference

| Symptom                                                  | Likely Cause                                | Troubleshooting Steps                                                                      |
| :------------------------------------------------------- | :------------------------------------------ | :----------------------------------------------------------------------------------------- |
| `Can't resolve './Root'` or `@remotion/google-fonts/...` | Image missing `src/` or full `node_modules` | Ensure Dockerfile matches the standalone configuration block copying these source folders. |
| `FFmpeg quit ... SIGKILL`                                | Out of Memory (OOM)                         | Upgrade RAM profile to 1GB - 2GB. Verify that `concurrency` is restricted to `1`.          |
| **502 Bad Gateway** / **Failed to fetch**                | Process crashed or connection timeout       | Review Nginx `proxy_read_timeout` settings or server console logs for memory usage spikes. |
| Build fails with old `chromiumOptions.args`              | Stale build cache                           | Trigger redeploy without build cache inside hosting provider.                              |
