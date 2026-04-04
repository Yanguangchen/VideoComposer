import { readdir } from "fs/promises";
import path from "path";

import type { MediaAsset } from "@/config/background-music";

const MUSIC_EXT = /\.(mp3|wav|m4a|aac|ogg)$/i;
const BACKGROUND_EXT = /\.(mp4|webm|mov|m4v|jpg|jpeg|png|webp)$/i;

/** Folders under `public/` that contain music (recursive). */
export const MUSIC_SCAN_DIRS = ["music", "background music"] as const;

/** Folders under `public/` that contain background video or stills (recursive). */
export const BACKGROUND_SCAN_DIRS = [
  "background-videos",
  "background music",
  "background-music",
  "background-video",
  "backgrounds",
] as const;

function shouldSkipEntry(name: string): boolean {
  return name.startsWith(".") || name.startsWith("_");
}

async function walkFiles(
  dirAbs: string,
  relBase: string,
): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dirAbs, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const e of entries) {
    if (shouldSkipEntry(e.name)) continue;
    const rel = relBase ? `${relBase}/${e.name}` : e.name;
    const full = path.join(dirAbs, e.name);
    if (e.isDirectory()) {
      out.push(...(await walkFiles(full, rel)));
    } else if (e.isFile()) {
      out.push(rel.split(path.sep).join("/"));
    }
  }
  return out;
}

function toAsset(publicPath: string): MediaAsset {
  const base = path.basename(publicPath);
  return {
    id: publicPath,
    label: base,
    publicPath,
  };
}

function filterByExt(paths: string[], re: RegExp): MediaAsset[] {
  return paths
    .filter((p) => re.test(p))
    .map(toAsset)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

/**
 * Scans known `public/` folders for media files (server-only).
 */
export async function scanPublicMedia(): Promise<{
  music: MediaAsset[];
  backgrounds: MediaAsset[];
}> {
  const publicDir = path.join(process.cwd(), "public");

  const musicPaths: string[] = [];
  for (const root of MUSIC_SCAN_DIRS) {
    const abs = path.join(publicDir, root);
    musicPaths.push(...(await walkFiles(abs, root)));
  }

  const bgPaths: string[] = [];
  for (const root of BACKGROUND_SCAN_DIRS) {
    const abs = path.join(publicDir, root);
    bgPaths.push(...(await walkFiles(abs, root)));
  }

  return {
    music: filterByExt(musicPaths, MUSIC_EXT),
    backgrounds: filterByExt(bgPaths, BACKGROUND_EXT),
  };
}
