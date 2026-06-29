# Shared Media Library — Setup & Architecture Guide

The dashboard has a **Brand media library** step (accordion #2) that lets you bulk-upload photos to a Firebase project once and then pick them into any template (Before/After, Single, Carousel) without re-uploading each time.

Partition key = `brandId` from `src/config/brands.ts`, so every brand has an isolated library and the picker auto-filters to whichever brand is active.

---

## 1. Files Touched

| File                                                                                                                                     | Role                                                                                                            |
| :--------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| [src/lib/firebase.ts](file:///C:/Users/Yangu/Documents/GitHub/VideoComposer/src/lib/firebase.ts)                                         | Lazy browser-only singletons (`getDb`, `getStorageBucket`, `isFirebaseConfigured`). Throws if env vars missing. |
| [src/lib/media-library.ts](file:///C:/Users/Yangu/Documents/GitHub/VideoComposer/src/lib/media-library.ts)                               | Core functions: `subscribeLibraryMedia`, `uploadLibraryMedia`, `deleteLibraryAsset`, `libraryAssetToFile`.      |
| [src/components/BrandMediaLibrary.tsx](file:///C:/Users/Yangu/Documents/GitHub/VideoComposer/src/components/BrandMediaLibrary.tsx)       | Accordion panel — bulk upload dropzone, per-file progress, grid of existing assets with delete.                 |
| [src/components/MediaLibraryPicker.tsx](file:///C:/Users/Yangu/Documents/GitHub/VideoComposer/src/components/MediaLibraryPicker.tsx)     | Modal — single or multi-select grid; resolves picked assets to `File[]`.                                        |
| [src/components/MediaUploader.tsx](file:///C:/Users/Yangu/Documents/GitHub/VideoComposer/src/components/MediaUploader.tsx)               | Optional **Pick from library** button below the dropzone.                                                       |
| [src/components/CarouselSlidesEditor.tsx](file:///C:/Users/Yangu/Documents/GitHub/VideoComposer/src/components/CarouselSlidesEditor.tsx) | Optional **Bulk add from library** button next to "+ Add slide".                                                |
| [src/app/dashboard-client.tsx](file:///C:/Users/Yangu/Documents/GitHub/VideoComposer/src/app/dashboard-client.tsx)                       | Library accordion step + modal instance + picker logic helpers (`pickOneFromLibrary`, `pickManyFromLibrary`).   |

No server API routes are added for Firebase — all reads/writes go from the browser straight to Firebase. The existing `/api/render` path still receives data URLs because library picks are fetched to `File` before being handed to the dashboard's existing `setBefore` / `setAfter` / `setSingle` / slide helpers. This keeps the Remotion server render pipeline completely independent of Firebase.

---

## 2. Configuration & Credentials Setup

### 2.1 Web SDK Env Vars

Locally, create `.env.local` and populate the Firebase web config parameters from your Firebase console (**Project settings → General → Your apps → SDK setup**).

```properties
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id # Optional
```

> [!NOTE]
> The `apiKey` is not a secret. It is built directly into the client-side JavaScript. Real security is enforced via Firestore and Storage rules (see below).

### 2.2 Production Build Steps (Docker / Railway)

These are `NEXT_PUBLIC_*` variables and must be present when **`next build`** compiles the client bundle.

- On Railway, configure these under **Variables**.
- Trigger a **redeploy without build cache** to guarantee Next.js rebuilds the static files with the new values. If not configured, the media library step will display an amber notice indicating Firebase features are disabled.

---

## 3. Database & Storage Rules

### 3.1 Firestore Setup

1. Enable **Firestore Database** in Native mode.
2. **Composite Query Index**: To support real-time listing, a composite index is required. It can be set up manually in the console:
   - **Collection Group**: `media`
   - **Fields**: `brandId` (Ascending), `uploadedAt` (Descending)
   - **Query Scope**: Collection

Apply these security rules inside `firestore.rules` (replace placeholder UIDs with UIDs from **Authentication → Users** panel):

```javascript
rules_version = "2";
service cloud.firestore {
  match /databases/{database}/documents {
    function isAllowed() {
      return request.auth != null && request.auth.uid in [
        "YOUR_UID_HERE",
        "ANOTHER_UID_HERE"
      ];
    }

    match /media/{mediaId} {
      allow read, create, delete: if isAllowed();
      // Metadata is append-only to prevent storage pointers from desynchronizing
      allow update: if false;
    }

    match /brandContexts/{brandId} {
      allow read, write: if isAllowed();
    }
  }
}
```

### 3.2 Firebase Storage Setup & Security Rules

Enable Firebase Storage (Default bucket is fine) and configure the `storage.rules`:

```javascript
rules_version = "2";
service firebase.storage {
  match /b/{bucket}/o {
    match /brands/{brandId}/{asset=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 4. Storage Bucket CORS Configuration

CORS headers must be set on the bucket to allow the browser to download files programmatically (e.g. for canvas crops or passing files to the Remotion pipeline via the SDK). Without CORS, downloads using `getBytes` will fail after ~60s of preflight timeouts with `ERR_FAILED` blockages.

### 4.1 CLI Setup & Authentication

Install the Google Cloud CLI ([Google Cloud SDK installation guide](https://cloud.google.com/sdk/docs/install)).

1. Log into your Google Cloud account associated with the Firebase project:
   ```bash
   gcloud auth login
   ```
2. Set your active target project:
   ```bash
   gcloud config set project your-project-id
   ```

### 4.2 Applying the CORS Configuration

Apply the `cors.json` file (located in the repository root) to your storage bucket using the Google Cloud SDK:

```bash
# Using Cloud SDK storage tool:
gcloud storage buckets update gs://YOUR_PROJECT_ID.firebasestorage.app --cors-file=cors.json

# Alternative using gsutil:
gsutil cors set cors.json gs://YOUR_PROJECT_ID.firebasestorage.app
```

Verify that the CORS rules are active:

```bash
gcloud storage buckets describe gs://YOUR_PROJECT_ID.firebasestorage.app --format='value(cors_config)'
```

---

## 5. Media Library Architecture & Schema

### 5.1 Document Schema (`media/{mediaId}`)

Metadata documents inside the `media` Firestore collection are structured as follows:

| Field         | Type        | Description                                                                            |
| :------------ | :---------- | :------------------------------------------------------------------------------------- |
| `brandId`     | `string`    | The matching `id` from `src/config/brands.ts` used to partition the asset pool.        |
| `storagePath` | `string`    | Absolute location pointer in Firebase Storage: `brands/{brandId}/{mediaId}.{ext}`.     |
| `downloadUrl` | `string`    | Tokenized download URL returned by the Storage SDK (used for rendering preview cards). |
| `filename`    | `string`    | Original filename uploaded by the user.                                                |
| `contentType` | `string`    | MIME type (e.g. `image/png`, `image/jpeg`).                                            |
| `sizeBytes`   | `number`    | Size in bytes of the uploaded asset.                                                   |
| `uploadedAt`  | `Timestamp` | Database timestamp set server-side (`serverTimestamp()`).                              |

### 5.2 Content Type Extension Resolution

File extensions in storage are determined by the `extForContentType` helper in [src/lib/media-library.ts](file:///C:/Users/Yangu/Documents/GitHub/VideoComposer/src/lib/media-library.ts):

- Standard MIME checking: `image/jpeg` $\rightarrow$ `jpg`, other `image/*` formats dynamically resolve by parsing the subtype.
- Fallback: Checks the original file extension using filename string matching.
- Default: If no extension can be determined, falls back to `.bin`.

---

## 6. Real-Time Operations Pipeline

### 6.1 Parallelized Upload Sequence

When multiple files are dropped into the uploader, [src/lib/media-library.ts](file:///C:/Users/Yangu/Documents/GitHub/VideoComposer/src/lib/media-library.ts) runs parallel upload tasks using `uploadBytesResumable` within a Promise map:

```typescript
const jobs = files.map(file => new Promise(...));
const results = await Promise.allSettled(jobs);
return results
  .filter((r): r is PromiseFulfilledResult<LibraryAsset> => r.status === "fulfilled")
  .map(r => r.value);
```

- Individual progress rates are updated dynamically.
- Failed uploads are isolated via `Promise.allSettled` to prevent single-file failures from breaking bulk operations.

### 6.2 Deletion Order & Database Synchronization

To avoid orphan storage files or broken pointers:

1. Deletion triggers the Storage object deletion first (`deleteObject`).
2. If storage object deletion succeeds (or fails with `storage/object-not-found` indicating the file is already gone), the Firestore pointer document is deleted (`deleteDoc`).
3. Firestore `onSnapshot` real-time listeners capture the document removal, dynamically refreshing all UI grids and modals instantly.

### 6.3 Secure Asset Downloads

To download library files for rendering:

- The app uses `getBytes(objectRef)` which calls the Firebase Storage API rather than fetching from the public `downloadUrl`. This guarantees that operations are fully validated by the Storage Security rules rather than relying on guessable public URLs.
