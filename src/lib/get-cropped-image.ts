import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export type CroppedImageOptions = {
  /** Max width or height in pixels (keeps aspect). Default 1920. */
  maxDimension?: number;
  mimeType?: string;
  quality?: number;
};

/**
 * Renders the cropped region from `imageSrc` to a JPEG/PNG blob, optionally
 * downscaling so the longest side is at most `maxDimension`.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  options?: CroppedImageOptions,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const maxDim = options?.maxDimension ?? 1920;
  const { width: cw, height: ch } = pixelCrop;
  const scale = Math.min(1, maxDim / Math.max(cw, ch));
  const outW = Math.max(1, Math.round(cw * scale));
  const outH = Math.max(1, Math.round(ch * scale));
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH,
  );
  const mime = options?.mimeType ?? "image/jpeg";
  const quality = options?.quality ?? 0.92;
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      mime,
      quality,
    );
  });
}
