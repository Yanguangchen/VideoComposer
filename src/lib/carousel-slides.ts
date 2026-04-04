export const MAX_CAROUSEL_SLIDES = 12;

export type CarouselSlideDraft = {
  id: string;
  file: File | null;
  url: string | null;
  title: string;
};

export function createCarouselSlide(): CarouselSlideDraft {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file: null,
    url: null,
    title: "",
  };
}

export function createInitialCarouselSlides(): CarouselSlideDraft[] {
  return [createCarouselSlide(), createCarouselSlide()];
}
