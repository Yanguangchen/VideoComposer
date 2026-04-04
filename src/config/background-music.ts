/**
 * Optional manual entries (labels override auto-scan). The app also scans
 * `public/music/` and background folders — see `src/lib/scan-public-media.ts`.
 */
export type MediaAsset = {
  id: string;
  label: string;
  /** Path under public/, e.g. "background-videos/calm.mp4" */
  publicPath: string;
};

export const BACKGROUND_VIDEOS: MediaAsset[] = [];

export const MUSIC_TRACKS: MediaAsset[] = [];

/** Merge scanned + config; config wins on duplicate `publicPath`. */
export function mergeMediaAssets(
  scanned: MediaAsset[],
  config: MediaAsset[],
): MediaAsset[] {
  const m = new Map<string, MediaAsset>();
  for (const a of scanned) {
    m.set(a.publicPath, a);
  }
  for (const a of config) {
    m.set(a.publicPath, a);
  }
  return [...m.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

/** Path for Remotion `staticFile` / preview (raw; spaces allowed in segment). */
export function publicAssetUrl(publicPath: string): string {
  const p = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return `/${p}`;
}

/** Absolute URL for server render (encode path for valid URL). */
export function originPublicUrl(origin: string, publicPath: string): string {
  if (!publicPath) return "";
  const p = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return `${origin}${encodeURI(`/${p}`)}`;
}
