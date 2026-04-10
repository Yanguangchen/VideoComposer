/** Pixel nudge for the circular brand logo on the video frame (0 = template default). */

export const DEFAULT_LOGO_OFFSET_X_PX = 0;

export const DEFAULT_LOGO_OFFSET_Y_PX = 0;

export const MIN_LOGO_OFFSET_PX = -400;

export const MAX_LOGO_OFFSET_PX = 400;

export const LOGO_OFFSET_STEP_PX = 4;

export function clampLogoOffset(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(
    MAX_LOGO_OFFSET_PX,
    Math.max(MIN_LOGO_OFFSET_PX, value),
  );
}
