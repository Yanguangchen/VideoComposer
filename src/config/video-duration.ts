/** Project frame rate (must match Remotion compositions). */
export const VIDEO_FPS = 30;

export const MIN_DURATION_SECONDS = 2;
export const MAX_DURATION_SECONDS = 90;
export const DEFAULT_DURATION_SECONDS = 5;

export const DEFAULT_DURATION_FRAMES = Math.round(
  DEFAULT_DURATION_SECONDS * VIDEO_FPS,
);

export function secondsToDurationFrames(seconds: number): number {
  return Math.round(seconds * VIDEO_FPS);
}

export function clampDurationSeconds(seconds: number): number {
  return Math.min(
    MAX_DURATION_SECONDS,
    Math.max(MIN_DURATION_SECONDS, seconds),
  );
}

export function clampDurationFrames(frames: number): number {
  const minF = secondsToDurationFrames(MIN_DURATION_SECONDS);
  const maxF = secondsToDurationFrames(MAX_DURATION_SECONDS);
  return Math.min(maxF, Math.max(minF, Math.round(frames)));
}
