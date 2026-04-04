import { staticFile } from "remotion";

export const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGicnGzqQAAAABJRU5ErkJggg==";

export function resolveMediaSrc(src: string): string {
  if (!src) return PIXEL;
  if (
    src.startsWith("http") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }
  const trimmed = src.startsWith("/") ? src.slice(1) : src;
  return staticFile(trimmed);
}
