// @vitest-environment jsdom

import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, vi } from "vitest";

import {
  clearDraft,
  draftHasContent,
  DRAFT_VERSION,
  isDraftStorageAvailable,
  loadDraft,
  saveDraftMedia,
  saveDraftSettings,
  type DraftMedia,
  type DraftSettings,
  type ProjectDraft,
} from "../src/lib/project-draft";

const settings: DraftSettings = {
  version: DRAFT_VERSION,
  savedAt: 1,
  templateMode: "before-after",
  activeBrandId: "le-motor",
  logoFile: null,
  showLogo: true,
  logoOffsetXPx: 0,
  logoOffsetYPx: 0,
  serviceTitle: "",
  subtitleText: "",
  showPriceTag: false,
  priceTagText: "",
  brandTitleFontId: "outfit",
  serviceFontId: "outfit",
  headlineColorHex: "#ffffff",
  captionColorHex: "#ffffff",
  textSizeScale: 1,
  backgroundPath: null,
  musicPath: null,
  durationSeconds: 5,
  showBeforeAfterArrow: true,
};

const emptyMedia: DraftMedia = {
  beforeFile: null,
  afterFile: null,
  singleFile: null,
  carouselSlides: [],
};

function deleteDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("video-composer");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

beforeEach(deleteDatabase);
afterEach(() => vi.unstubAllGlobals());

describe("project draft persistence", () => {
  it("detects unavailable storage and safely skips persistence", async () => {
    vi.stubGlobal("indexedDB", undefined);
    assert.equal(isDraftStorageAvailable(), false);
    await saveDraftSettings(settings);
    await saveDraftMedia(emptyMedia);
    await clearDraft();
    assert.equal(await loadDraft(), null);
  });

  it("saves and loads settings with default media", async () => {
    assert.equal(isDraftStorageAvailable(), true);
    await saveDraftSettings(settings);
    assert.deepEqual(await loadDraft(), { settings, media: emptyMedia });
  });

  it("saves media and clears both records", async () => {
    const media: DraftMedia = {
      ...emptyMedia,
      beforeFile: new File(["before"], "before.jpg", { type: "image/jpeg" }),
      carouselSlides: [{ id: "slide", title: "Title", file: null }],
    };
    await saveDraftSettings(settings);
    await saveDraftMedia(media);
    const loaded = await loadDraft();
    assert.equal(Boolean(loaded?.media.beforeFile), true);
    assert.equal(loaded?.media.carouselSlides[0]?.title, "Title");
    await clearDraft();
    assert.equal(await loadDraft(), null);
  });

  it("drops incompatible draft versions", async () => {
    await saveDraftSettings({ ...settings, version: DRAFT_VERSION + 1 });
    assert.equal(await loadDraft(), null);
  });

  it("returns null and makes clearing best-effort when opening storage fails", async () => {
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new Error("blocked");
    });
    assert.equal(await loadDraft(), null);
    await clearDraft();
  });
});

describe("draftHasContent", () => {
  const draft = (overrides: Partial<ProjectDraft> = {}): ProjectDraft => ({
    settings,
    media: emptyMedia,
    ...overrides,
  });

  it("returns false for an empty draft", () => {
    assert.equal(draftHasContent(draft()), false);
  });

  it("detects text in every supported text field", () => {
    for (const field of ["serviceTitle", "subtitleText", "priceTagText"] as const) {
      assert.equal(
        draftHasContent(draft({ settings: { ...settings, [field]: " content " } })),
        true,
      );
    }
  });

  it("detects each direct media slot and carousel files", () => {
    const image = new File(["x"], "image.png", { type: "image/png" });
    for (const field of ["beforeFile", "afterFile", "singleFile"] as const) {
      assert.equal(draftHasContent(draft({ media: { ...emptyMedia, [field]: image } })), true);
    }
    assert.equal(
      draftHasContent(
        draft({ media: { ...emptyMedia, carouselSlides: [{ id: "1", title: "", file: image }] } }),
      ),
      true,
    );
  });
});
