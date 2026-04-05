"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { getCroppedImageBlob } from "@/lib/get-cropped-image";

const ASPECT_PRESETS: { label: string; value: number }[] = [
  { label: "Video (9:16)", value: 9 / 16 },
  { label: "Square (1:1)", value: 1 },
  { label: "Portrait (4:5)", value: 4 / 5 },
  { label: "Landscape (16:9)", value: 16 / 9 },
];

function closestPresetIndex(aspect: number): number {
  let best = 0;
  let bestDiff = Infinity;
  ASPECT_PRESETS.forEach((p, i) => {
    const d = Math.abs(p.value - aspect);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  });
  return best;
}

type Props = {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  /** Called with a new JPEG file after the user applies the crop. */
  onApply: (file: File) => void;
  /** Suggested base name (e.g. original upload name). */
  fileNameHint?: string | null;
  /** Default aspect width ÷ height (default 9:16 for vertical video). */
  defaultAspect?: number;
};

export function ImageCropModal({
  open,
  imageSrc,
  onClose,
  onApply,
  fileNameHint,
  defaultAspect = 9 / 16,
}: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectPresetIndex, setAspectPresetIndex] = useState(0);
  const croppedAreaPixelsRef = useRef<Area | null>(null);
  const aspect = ASPECT_PRESETS[aspectPresetIndex]?.value ?? 9 / 16;

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAspectPresetIndex(closestPresetIndex(defaultAspect));
      croppedAreaPixelsRef.current = null;
    }
  }, [open, imageSrc, defaultAspect]);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      croppedAreaPixelsRef.current = croppedAreaPixels;
    },
    [],
  );

  const handleApply = useCallback(async () => {
    const pixels = croppedAreaPixelsRef.current;
    if (!pixels || !imageSrc) return;
    try {
      const blob = await getCroppedImageBlob(imageSrc, pixels, {
        maxDimension: 1920,
        mimeType: "image/jpeg",
        quality: 0.92,
      });
      const base =
        (fileNameHint?.replace(/\.[^.]+$/, "") || "image").replace(
          /[^\w\-]+/g,
          "-",
        ) || "image";
      const file = new File([blob], `${base}-cropped.jpg`, {
        type: "image/jpeg",
      });
      onApply(file);
    } catch (e) {
      console.error(e);
    }
  }, [imageSrc, fileNameHint, onApply]);

  if (!open || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close crop dialog"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-600">
          <h2
            id="crop-modal-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Crop &amp; position
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Drag to reframe. Use zoom to scale. Matches your video frame best at
            9:16.
          </p>
        </div>

        <div className="relative h-[min(52vh,420px)] w-full bg-slate-900">
          <Cropper
            key={`${imageSrc}-${aspectPresetIndex}`}
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={0}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
            style={{}}
            classes={{}}
          />
        </div>

        <div className="space-y-3 border-b border-slate-200 px-4 py-3 dark:border-slate-600">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            Frame shape
            <select
              value={aspectPresetIndex}
              onChange={(e) => setAspectPresetIndex(Number(e.target.value))}
              className="mt-0.5 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {ASPECT_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}
