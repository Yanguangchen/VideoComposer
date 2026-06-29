"use client";

import type { TemplateModeId } from "@/config/template-modes";
import type { ServiceFontId } from "@/config/service-fonts";

/**
 * Local, dependency-free autosave for the in-progress video project.
 *
 * State is split into two IndexedDB records inside one object store:
 *
 *   - "settings": every small, JSON-serializable field (template, brand, text,
 *     colors, fonts, media paths, duration…). Cheap to rewrite on each edit.
 *   - "media": the uploaded `File` blobs (before/after/single + carousel
 *     slides). IndexedDB stores `File`/`Blob` natively via structured clone, so
 *     there is no base64 bloat and no ~5 MB localStorage ceiling. Only rewritten
 *     when the files themselves change.
 *
 * This is browser-local only: the draft lives in the user's IndexedDB and does
 * not sync across devices. (A signed-in, Firebase-backed sync could be layered
 * on later — see src/lib/media-library.ts for the upload pattern.)
 */

const DB_NAME = "video-composer";
const DB_VERSION = 1;
const STORE = "project-draft";
const SETTINGS_KEY = "settings";
const MEDIA_KEY = "media";

/** Bump when the settings shape changes incompatibly so stale drafts are dropped. */
export const DRAFT_VERSION = 1;

export type DraftSettings = {
  version: number;
  savedAt: number;
  templateMode: TemplateModeId;
  activeBrandId: string;
  logoFile: string | null;
  showLogo: boolean;
  logoOffsetXPx: number;
  logoOffsetYPx: number;
  serviceTitle: string;
  subtitleText: string;
  showPriceTag: boolean;
  priceTagText: string;
  brandTitleFontId: ServiceFontId;
  serviceFontId: ServiceFontId;
  headlineColorHex: string;
  captionColorHex: string;
  textSizeScale: number;
  backgroundPath: string | null;
  musicPath: string | null;
  durationSeconds: number;
  showBeforeAfterArrow: boolean;
};

export type DraftSlide = {
  id: string;
  title: string;
  file: File | null;
};

export type DraftMedia = {
  beforeFile: File | null;
  afterFile: File | null;
  singleFile: File | null;
  carouselSlides: DraftSlide[];
};

export type ProjectDraft = {
  settings: DraftSettings;
  media: DraftMedia;
};

/** True when IndexedDB is available (SSR and locked-down browsers may lack it). */
export function isDraftStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result as T);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

/** Persist the settings record (small; safe to call on every edit, debounced). */
export async function saveDraftSettings(settings: DraftSettings): Promise<void> {
  if (!isDraftStorageAvailable()) return;
  await withStore("readwrite", (s) => s.put(settings, SETTINGS_KEY));
}

/** Persist the media record (potentially large; call only when files change). */
export async function saveDraftMedia(media: DraftMedia): Promise<void> {
  if (!isDraftStorageAvailable()) return;
  await withStore("readwrite", (s) => s.put(media, MEDIA_KEY));
}

/**
 * Read both records. Returns null when there is no usable draft (nothing saved,
 * a version mismatch, or storage is unavailable). A version bump silently
 * discards the stale draft rather than restoring an incompatible shape.
 */
export async function loadDraft(): Promise<ProjectDraft | null> {
  if (!isDraftStorageAvailable()) return null;
  try {
    const [settings, media] = await Promise.all([
      withStore<DraftSettings | undefined>("readonly", (s) => s.get(SETTINGS_KEY)),
      withStore<DraftMedia | undefined>("readonly", (s) => s.get(MEDIA_KEY)),
    ]);
    if (!settings || settings.version !== DRAFT_VERSION) return null;
    return {
      settings,
      media: media ?? {
        beforeFile: null,
        afterFile: null,
        singleFile: null,
        carouselSlides: [],
      },
    };
  } catch {
    return null;
  }
}

/** Delete the saved draft (both records). */
export async function clearDraft(): Promise<void> {
  if (!isDraftStorageAvailable()) return;
  try {
    await withStore("readwrite", (s) => s.delete(SETTINGS_KEY));
    await withStore("readwrite", (s) => s.delete(MEDIA_KEY));
  } catch {
    /* best-effort */
  }
}

/** True when the draft holds anything worth offering to resume. */
export function draftHasContent(draft: ProjectDraft): boolean {
  const { settings, media } = draft;
  return Boolean(
    settings.serviceTitle.trim() ||
    settings.subtitleText.trim() ||
    settings.priceTagText.trim() ||
    media.beforeFile ||
    media.afterFile ||
    media.singleFile ||
    media.carouselSlides.some((s) => s.file),
  );
}
