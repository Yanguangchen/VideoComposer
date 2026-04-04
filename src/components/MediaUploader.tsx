"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

type Props = {
  label: string;
  description: string;
  imageSrc: string | null;
  onFile: (file: File | null) => void;
};

export function MediaUploader({
  label,
  description,
  imageSrc,
  onFile,
}: Props) {
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={label}
          className="max-h-48 w-full rounded-lg object-contain ring-1 ring-slate-200 dark:ring-slate-600"
        />
      ) : null}
    </div>
  );
}
