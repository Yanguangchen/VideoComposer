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
};

export function CarouselSlidesEditor({ slides, onChange }: Props) {
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
      <p className="text-xs text-slate-500">
        Each slide shows for ~1.5s. Add a title per image (caption). Up to{" "}
        {MAX_CAROUSEL_SLIDES} slides.
      </p>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Slide {index + 1}
            </span>
            {slides.length > 1 ? (
              <button
                type="button"
                onClick={() => removeSlide(slide.id)}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            ) : null}
          </div>
          <label className="mb-2 block text-xs font-medium text-slate-700">
            Slide title
            <input
              type="text"
              value={slide.title}
              onChange={(e) => setTitle(slide.id, e.target.value)}
              placeholder="e.g. Deep cleanse"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </label>
          <MediaUploader
            label="Image"
            description="Photo for this slide."
            imageSrc={slide.url}
            onFile={(f) => setSlideFile(slide.id, f)}
          />
        </div>
      ))}
      {slides.length < MAX_CAROUSEL_SLIDES ? (
        <button
          type="button"
          onClick={addSlide}
          className="rounded-lg border-2 border-dashed border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50/50"
        >
          + Add slide
        </button>
      ) : null}
    </div>
  );
}
