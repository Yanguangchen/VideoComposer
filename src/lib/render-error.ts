/**
 * User-facing messages for Remotion / FFmpeg / browser failures (avoid raw stack traces).
 */
export function formatRenderError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Rendering failed for an unknown reason. Check the server logs.";
  }

  const m = error.message;

  if (/ENOENT|no such file|not found/i.test(m) && /ffmpeg|chrome|browser/i.test(m)) {
    return "FFmpeg or Remotion’s headless browser is missing on the machine running `next dev` (your web browser is not used for export). Install FFmpeg on your PATH, restart the terminal, then try again. See README → Export (MP4).";
  }

  if (/browser|chromium|puppeteer|executable|launch/i.test(m)) {
    return "Could not start the headless browser used for rendering. On Linux, install Chromium dependencies; see Remotion’s docs for server rendering.";
  }

  if (/ffmpeg|encoding|codec|mux|stitch/i.test(m)) {
    return `Video encoding failed: ${m}`;
  }

  if (/timeout|ETIMEDOUT/i.test(m)) {
    return "Rendering timed out. Try a shorter video or reduce resolution.";
  }

  if (/ENOSPC|space/i.test(m)) {
    return "Not enough disk space to write the video file.";
  }

  if (/EACCES|permission/i.test(m)) {
    return "Permission denied while writing the video. Check the temp directory.";
  }

  return m.length > 400 ? `${m.slice(0, 400)}…` : m;
}
