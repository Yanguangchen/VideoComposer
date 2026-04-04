const IMAGE_EXT = /\.(png|jpe?g|svg|webp|gif)$/i;

const PREFERRED = [
  "logo.svg",
  "logo.png",
  "logo.jpg",
  "logo.jpeg",
  "primary.svg",
  "primary.png",
];

export function pickDefaultLogoFile(files: string[]): string | null {
  if (files.length === 0) return null;
  for (const name of PREFERRED) {
    if (files.includes(name)) return name;
  }
  return [...files].sort((a, b) => a.localeCompare(b))[0] ?? null;
}

export function filterLogoFilenames(entries: string[]): string[] {
  return entries.filter((f) => !f.startsWith(".") && IMAGE_EXT.test(f));
}

export const LOGO_STORAGE_PREFIX = "video-composer-logo:";
