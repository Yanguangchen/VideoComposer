"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageCropModal } from "@/components/ImageCropModal";

type Props = {
  label: string;
  description: string;
  imageSrc: string | null;
  onFile: (file: File | null) => void;
  /** Original file (used for naming cropped exports). */
  sourceFile?: File | null;
  /** Show “Crop & position” when an image is loaded (default true). */
  enableCrop?: boolean;
  /** Default crop frame width ÷ height (default 9:16 for vertical video). */
  cropAspect?: number;
};

export function MediaUploader({
  label,
  description,
  imageSrc,
  onFile,
  sourceFile = null,
  enableCrop = true,
  cropAspect = 9 / 16,
}: Props) {
  const [cropOpen, setCropOpen] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const f = accepted[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    maxFiles: 1,
    multiple: false,
    /** Improves compatibility with mobile browsers that mishandle the File System Access API. */
    useFsAccessApi: false,
  });

  const handleCroppedFile = useCallback(
    (file: File) => {
      setCropOpen(false);
      onFile(file);
    },
    [onFile],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
      </div>
      <div
        {...getRootProps()}
        className={`touch-manipulation flex min-h-[160px] min-w-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors active:opacity-90 ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
            : "border-slate-300 bg-white hover:border-blue-400 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:border-blue-500"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-center text-xs text-slate-600 dark:text-slate-300">
          {description}
        </p>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Drag &amp; drop or click to browse
        </p>
      </div>
      {imageSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={label}
            className="max-h-48 w-full rounded-lg object-contain ring-1 ring-slate-200 dark:ring-slate-600"
          />
          {enableCrop ? (
            <button
              type="button"
              onClick={() => setCropOpen(true)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Crop &amp; position
            </button>
          ) : null}
          <ImageCropModal
            open={cropOpen}
            imageSrc={imageSrc}
            onClose={() => setCropOpen(false)}
            onApply={handleCroppedFile}
            fileNameHint={sourceFile?.name ?? null}
            defaultAspect={cropAspect}
          />
        </>
      ) : null}
    </div>
  );
}
