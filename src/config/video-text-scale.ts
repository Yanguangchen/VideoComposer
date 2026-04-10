/** Multiplier for all on-video typography (headlines, captions, price tag, slide titles). */

export const DEFAULT_VIDEO_TEXT_SIZE_SCALE = 1;

export const MIN_VIDEO_TEXT_SIZE_SCALE = 0.65;

export const MAX_VIDEO_TEXT_SIZE_SCALE = 1.65;

export const VIDEO_TEXT_SIZE_SCALE_STEP = 0.05;

export function clampVideoTextSizeScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VIDEO_TEXT_SIZE_SCALE;
  return Math.min(
    MAX_VIDEO_TEXT_SIZE_SCALE,
    Math.max(MIN_VIDEO_TEXT_SIZE_SCALE, value),
  );
}
