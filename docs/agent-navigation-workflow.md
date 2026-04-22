# AI agent navigation workflow — Video Composer

This document describes how an **AI agent** (browser automation, testing harness, or coding assistant driving the UI) should **navigate and use** the Video Composer dashboard at `/` (single-page app).

---

## 1. Entry URL and shell

- **Route:** `/` loads `DashboardClient` (client-only dashboard).
- **Header:** “Video Composer” title, tagline, **Sign out**, **theme toggle** (light/dark).
- **Main:** Two-column layout on large screens — **left:** configuration accordions + Export; **right:** **Preview** accordion.

---

## 2. Authentication gate (must pass first)

1. On first visit, a **modal dialog** (`role="dialog"`, “Sign in”) blocks the dashboard.
2. The form has a **Password** field (`type="password"`, `name="password"`) and a submit action.
3. Successful sign-in sets client storage and dismisses the modal; the full dashboard appears.
4. **Agents:** Read the current demo password from the repo constant **`SIMULATED_AUTH_PASSWORD`** in `src/lib/simulated-auth.ts` (do not hardcode secrets in automation configs; sync with that file if it changes).
5. **Sign out:** Header button clears sign-in and returns to the sign-in modal.

Until signed in, **no** accordion content is available.

---

## 3. Accordion navigation pattern

Steps use **`DashboardStepAccordion`**: only **one** section in the left column may be “open” at a time (`openLeftStepId`). Clicking a section **header** toggles that section open and closes others.

| Section id        | Title (approx.)                 |
|-------------------|----------------------------------|
| `layout`          | Layout                           |
| `brand`           | 1. Brand                         |
| `logo`            | 2. Logo (from disk)              |
| `colors`          | 3. Video text colors             |
| `background`      | 4. Background video & music      |
| `text`            | 5. Text & fonts                  |
| `duration`        | 6. Video length                  |
| `photos`          | 7. Images (label varies by mode) |

**Preview** (right column) uses a separate accordion id **`preview`**; it can stay open independently of the left column.

**Agent strategy:** Open each section by clicking its **visible heading** (or button that expands it), then interact with controls inside the expanded panel.

---

## 4. Recommended workflow (happy path)

Execute in order; skip steps that do not apply after **Layout** is chosen.

### Step A — Layout (`layout`)

- Find **“Video layout”** and three buttons: **Before / After**, **Single image**, **Carousel**.
- Click one to set `templateMode`:
  - **before-after** — two photos, optional arrow.
  - **single-image** — one hero image.
  - **carousel** — multiple slides (image + title each).

Changing layout **resets** uploaded photos in the client state.

### Step B — Brand (`brand`)

- Select a brand (list driven by `src/config/brands.ts`).
- Brand drives default headline text and logo folder.

### Step C — Logo (`logo`)

- **LogoPicker:** choose a file from the brand’s logo folder (or upload path as implemented).
- Checkbox **“Show logo in video”** — if **unchecked**, export does **not** require a logo file; if **checked**, a logo selection is required for export (see gating below).

### Step D — Colors (`colors`)

- Set **headline** and **caption** hex colors (color pickers / inputs).

### Step E — Background & music (`background`)

- Choose optional **background video** and **music** from scanned `public/` assets (dropdowns; may show loading until `/api/public-media` returns).

### Step F — Text & fonts (`text`)

- **Brand title font** — always relevant.
- **Subtitle** (optional).
- **Show price tag** + **price tag text** if enabled.
- **Service title** + **Service title font** — for **Before/After** and **Single image** only.
- **Carousel:** includes **Slide caption font**; **service title** block is not used the same way (per-slide titles in carousel step).

### Step G — Video length (`duration`)

- Set duration in seconds (clamped by app config).

### Step H — Photos (`photos`) — depends on layout

| Layout        | Actions |
|---------------|---------|
| **Single image** | One **MediaUploader** (“Hero image”). Optional **Crop & position** after upload. |
| **Before/After** | Two uploaders: **Before**, **After**. Optional **Show arrow between before & after**. |
| **Carousel** | **CarouselSlidesEditor:** per slide: **Slide title** text, **Image** upload, optional crop. **+ Add slide** up to max slides. |

**Export gating:**

- **showLogo true:** need logo **and** required images.
- **showLogo false:** need only required images (single / both before-after / every slide).

### Step I — Export (section below accordions)

- **“Export MP4”** button in the **Export** card.
- Disabled until `canExport` (see messages under the button when disabled).
- Triggers `POST /api/render` with progress polling on `/api/render/progress`; success downloads **video.mp4**.

### Step J — Preview (`preview`)

- Right column **“8. Preview”** — expand to see **Remotion Player** live preview.
- Preview reflects current props; useful to verify before export.

---

## 5. Composition IDs (for API / automation)

Mapping from `src/config/template-modes.ts`:

| Layout        | `templateMode`   | `compositionId` (POST body) |
|---------------|------------------|-------------------------------|
| Before/After  | `before-after`   | `BeforeAfter`                 |
| Single image  | `single-image`   | `SingleImage`                 |
| Carousel      | `carousel`       | `Carousel`                    |

---

## 6. Secondary actions

- **Go to Facebook Pages** — link under Export (`RenderAndDownload`), opens external URL in a new tab.
- **Theme toggle** — header; affects CSS class `dark` on `<html>`, not export output.

---

## 7. Pitfalls for agents

1. **Sign-in required** — automate password submit first.
2. **One accordion open** on the left — open the target section before querying controls inside it.
3. **Layout switch clears uploads** — set layout before uploading images.
4. **Carousel** — every slide must have an image file for export when requirements are met.
5. **Export** needs a **server** with FFmpeg + Remotion deps (local `next dev` or Docker); serverless hosts may return 503 (see `docs/deployment.md`).
6. **Crop modal** — opens from **Crop & position**; **Apply** replaces the file; **Cancel** closes without changes.

---

## 8. Quick reference — DOM / accessibility hints

- Sign-in: `role="dialog"`, heading “Sign in”.
- Main steps: accordion buttons/headings with section titles above.
- Export: primary button text **“Export MP4”**.
- Progress: region with **“Render progress”** (`role="progressbar"`) during render.

---

## 9. Related files

| File | Purpose |
|------|---------|
| `src/app/dashboard-client.tsx` | All steps, gating, export |
| `src/lib/simulated-auth.ts` | Sign-in storage + password constant |
| `src/config/template-modes.ts` | Layout ids ↔ composition ids |
| `src/config/brands.ts` | Brand list |
| `docs/deployment.md` | Production export constraints |
