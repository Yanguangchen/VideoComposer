# Shared media library — setup

The dashboard has a **Brand media library** step (accordion #2) that lets you
bulk-upload photos to a Firebase project once and then pick them into any
template (Before/After, Single, Carousel) without re-uploading each time.

Partition key = `brandId` from `src/config/brands.ts`, so every brand has an
isolated library and the picker auto-filters to whichever brand is active.

## Files touched

| File | Role |
|------|------|
| `src/lib/firebase.ts` | Lazy browser-only singletons (`getDb`, `getStorageBucket`, `isFirebaseConfigured`). Throws if env vars missing. |
| `src/lib/media-library.ts` | `subscribeLibraryMedia`, `uploadLibraryMedia`, `deleteLibraryAsset`, `libraryAssetToFile`. |
| `src/components/BrandMediaLibrary.tsx` | Accordion panel — bulk upload dropzone, per-file progress, grid of existing assets with delete. |
| `src/components/MediaLibraryPicker.tsx` | Modal — single or multi-select grid; resolves to `File[]`. |
| `src/components/MediaUploader.tsx` | Optional **Pick from library** button below the dropzone. |
| `src/components/CarouselSlidesEditor.tsx` | Optional **Bulk add from library** button next to "+ Add slide". |
| `src/app/dashboard-client.tsx` | New `library` accordion step + one modal instance + two helpers (`pickOneFromLibrary`, `pickManyFromLibrary`). |

No server API routes are added — all reads/writes go from the browser straight
to Firebase. The existing `/api/render` path still receives data URLs because
library picks are fetched to `File` before being handed to the dashboard's
existing `setBefore` / `setAfter` / `setSingle` / slide helpers. This keeps the
export pipeline unchanged.

## 1. Configure env vars

Locally, create `.env.local` and fill in the Firebase web config from the
Firebase console (**Project settings → General → Your apps → SDK setup**).

```
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=…  # optional
```

`apiKey` is **not a secret**. Real security comes from the rules below.

### Production (Docker / Railway)

These are `NEXT_PUBLIC_*` variables: they must be present when **`next build`** runs (see **`Dockerfile`** `builder` stage and **[docs/deployment.md](deployment.md) → Environment variables and Docker builds**). On Railway, add the same keys under the service **Variables** and redeploy. If the library still shows “Firebase not configured”, redeploy **without build cache** so the client bundle is rebuilt with the new values.

## 2. Firestore setup

Enable **Firestore** in the Firebase console (Native mode, any region).

### Required index

Firestore will log a deep link the first time you open the library; click it
to auto-create the composite index. The manual definition is:

- **Collection:** `media`
- **Fields:** `brandId` *Ascending*, `uploadedAt` *Descending*
- **Query scope:** Collection

### Security rules (`firestore.rules`)

For a single-operator setup where the app's simulated-auth password is the
only gate, allow reads/writes on `media` from any client. Lock it down to
signed-in users once you wire Firebase Auth.

```js
rules_version = "2";
service cloud.firestore {
  match /databases/{database}/documents {
    match /media/{mediaId} {
      allow read, create, delete: if true;
      // Metadata is append-only; updating would desync Storage.
      allow update: if false;
    }
  }
}
```

## 3. Storage setup

Enable **Storage** in the Firebase console. Default bucket is fine.

### Rules (`storage.rules`)

```js
rules_version = "2";
service firebase.storage {
  match /b/{bucket}/o {
    match /brands/{brandId}/{asset=**} {
      allow read, write: if true;
    }
  }
}
```

### CORS (required for **Pick from library**)

Firebase Storage **always** enforces CORS for cross-origin browser requests
(including `getBytes()` inside the Firebase SDK). Without a CORS config,
clicking **Use selection** in the picker will look stuck on *"Preparing…"*
while the SDK retries for ~60 seconds, then fail with:

```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...'
has been blocked by CORS policy
```

The repo ships a ready-to-apply config at **`cors.json`** (repo root). Edit
it so `origin` includes your deployed app URL(s), then apply it to the
bucket:

```bash
# Cloud SDK (installed via `gcloud components install cloud-storage`):
gcloud storage buckets update gs://YOUR_BUCKET.firebasestorage.app \
  --cors-file=cors.json

# Or legacy gsutil:
gsutil cors set cors.json gs://YOUR_BUCKET.firebasestorage.app
```

Replace `YOUR_BUCKET` with the value of **`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`**.

Verify:

```bash
gcloud storage buckets describe gs://YOUR_BUCKET.firebasestorage.app --format='value(cors_config)'
# or
gsutil cors get gs://YOUR_BUCKET.firebasestorage.app
```

Changes propagate in seconds. Hard-refresh the app tab to clear any cached
CORS preflight from a previous state.

## 4. Schema reference

### Firestore `media/{mediaId}`

| Field | Type | Notes |
|-------|------|-------|
| `brandId` | string | = `Brand.id` from `src/config/brands.ts` |
| `storagePath` | string | `brands/{brandId}/{mediaId}.{ext}` |
| `downloadUrl` | string | Tokenized URL; used directly in `<img>` and by the picker |
| `filename` | string | Original file name at upload time |
| `contentType` | string | MIME |
| `sizeBytes` | number | From `File.size` |
| `uploadedAt` | Timestamp | `serverTimestamp()` |

### Storage

```
brands/{brandId}/{mediaId}.{ext}
```

`mediaId` is a UUID (no hyphens) generated client-side; `ext` is derived from
`contentType` (falls back to the original filename).

## 5. Operational notes

- **Uploads run in parallel** — one `uploadBytesResumable` per file with a
  shared progress UI in `BrandMediaLibrary`.
- **Deletes** remove the Storage object first, then the Firestore doc. If
  the object is already gone (storage/object-not-found) we still delete the
  doc so the library view stays consistent.
- **Picks do not skip the export pipeline.** A picked asset is
  `fetch`-ed to a Blob, wrapped as a `File`, and fed into the existing
  `onFile` callback. Export still serializes the image as a data URL — this
  keeps the Remotion server render simple and independent of Firebase.
- **Real-time library view** — `onSnapshot` drives both the picker grid and
  the manager, so a new upload appears everywhere without refresh.

## 6. Disabling the feature

If `NEXT_PUBLIC_FIREBASE_*` vars are not set, `isFirebaseConfigured()` returns
false; the **Brand media library** step renders an "amber" notice and the
"Pick from library" buttons still appear but throw a clear error if clicked.
The rest of the dashboard works unchanged.
