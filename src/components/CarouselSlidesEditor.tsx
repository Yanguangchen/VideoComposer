"use client";

import { useCallback } from "react";
import { MediaUploader } from "@/components/MediaUploader";
import {
  createCarouselSlide,
  MAX_CAROUSEL_SLIDES,
  type CarouselSlideDraft,
} from "@/lib/carousel-slides";

type Props = {
  slides: CarouselSlideDraft[];
  onChange: (slides: CarouselSlideDraft[]) => void;
  /** Picker for one image; resolves to a File or null if the user cancels. */
  onPickFromLibrary?: () => Promise<File | null>;
  /**
   * Bulk picker returning up to N images; caller decides the cap based on
   * how many more slides fit. Resolves to [] on cancel.
   */
  onBulkAddFromLibrary?: (maxFiles: number) => Promise<File[]>;
};

export function CarouselSlidesEditor({
  slides,
  onChange,
  onPickFromLibrary,
  onBulkAddFromLibrary,
}: Props) {
  const updateSlide = useCallback(
    (id: string, patch: Partial<CarouselSlideDraft>) => {
      onChange(
        slides.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [onChange, slides],
  );

  const setSlideFile = useCallback(
    (id: string, file: File | null) => {
      const slide = slides.find((s) => s.id === id);
      if (!slide) return;
      if (slide.url) URL.revokeObjectURL(slide.url);
      updateSlide(id, {
        file,
        url: file ? URL.createObjectURL(file) : null,
      });
    },
    [slides, updateSlide],
  );

  const setTitle = useCallback(
    (id: string, title: string) => {
      updateSlide(id, { title });
    },
    [updateSlide],
  );

  const addSlide = useCallback(() => {
    if (slides.length >= MAX_CAROUSEL_SLIDES) return;
    onChange([...slides, createCarouselSlide()]);
  }, [onChange, slides]);

  const bulkAddFromLibrary = useCallback(async () => {
    if (!onBulkAddFromLibrary) return;
    const maxFiles = MAX_CAROUSEL_SLIDES - slides.length;
    if (maxFiles <= 0) return;
    const files = await onBulkAddFromLibrary(maxFiles);
    if (!files.length) return;
    const newSlides: CarouselSlideDraft[] = files
      .slice(0, maxFiles)
      .map((file) => ({
        ...createCarouselSlide(),
        file,
        url: URL.createObjectURL(file),
      }));
    onChange([...slides, ...newSlides]);
  }, [onBulkAddFromLibrary, onChange, slides]);

  const removeSlide = useCallback(
    (id: string) => {
      if (slides.length <= 1) return;
      const slide = slides.find((s) => s.id === id);
      if (slide?.url) URL.revokeObjectURL(slide.url);
      onChange(slides.filter((s) => s.id !== id));
    },
    [onChange, slides],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Slides share the video duration equally. Add a title per image
        (caption). Up to {MAX_CAROUSEL_SLIDES} slides.
      </p>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Slide {index + 1}
            </span>
            {slides.length > 1 ? (
              <button
                type="button"
                onClick={() => removeSlide(slide.id)}
                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Remove
              </button>
            ) : null}
          </div>
          <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-200">
            Slide title
            <input
              type="text"
              value={slide.title}
              onChange={(e) => setTitle(slide.id, e.target.value)}
              placeholder="e.g. Deep cleanse"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>
          <MediaUploader
            label="Image"
            description="Photo for this slide."
            imageSrc={slide.url}
            onFile={(f) => setSlideFile(slide.id, f)}
            sourceFile={slide.file}
            onPickFromLibrary={onPickFromLibrary}
          />
        </div>
      ))}
      {slides.length < MAX_CAROUSEL_SLIDES ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={addSlide}
            className="flex-1 rounded-lg border-2 border-dashed border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
          >
            + Add slide
          </button>
          {onBulkAddFromLibrary ? (
            <button
              type="button"
              onClick={bulkAddFromLibrary}
              className="flex-1 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/50 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-100/70 dark:border-emerald-700/60 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/30"
            >
              + Bulk add from library
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
