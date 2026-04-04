/**
 * User-facing messages for Remotion / FFmpeg / browser failures (avoid raw stack traces).
 */
export function formatRenderError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Rendering failed for an unknown reason. Check the server logs.";
  }

  const m = error.message;
  const isRailway = typeof process.env.RAILWAY_ENVIRONMENT === "string";
  const railwayHint = isRailway
    ? " On Railway: deploy must use the Dockerfile (see railway.toml, builder = DOCKERFILE). Confirm build logs show 'docker build'. If they show Railpack, change the service builder and redeploy."
    : "";

  if (
    /ENOENT|no such file|not found|missing/i.test(m) &&
    /ffmpeg|chrome|browser|headless/i.test(m)
  ) {
    return `FFmpeg or Remotion's headless browser is missing on the server.${railwayHint} Local dev: install FFmpeg on your PATH and restart the terminal. See README → Export (MP4). [${m.slice(0, 120)}]`;
  }

  if (/browser|chromium|puppeteer|executable|launch|headless/i.test(m)) {
    return `Could not start the headless browser for rendering.${railwayHint} On Linux, install Chromium dependencies; see Remotion's docs for server rendering. [${m.slice(0, 120)}]`;
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
