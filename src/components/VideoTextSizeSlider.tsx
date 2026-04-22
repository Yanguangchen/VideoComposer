"use client";

import {
  clampVideoTextSizeScale,
  DEFAULT_VIDEO_TEXT_SIZE_SCALE,
  MAX_VIDEO_TEXT_SIZE_SCALE,
  MIN_VIDEO_TEXT_SIZE_SCALE,
  VIDEO_TEXT_SIZE_SCALE_STEP,
} from "@/config/video-text-scale";

type Props = {
  value: number;
  onChange: (scale: number) => void;
};

export function VideoTextSizeSlider({ value, onChange }: Props) {
  const safe = clampVideoTextSizeScale(value);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Video text size
        </span>
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {(safe * 100).toFixed(0)}%
        </span>
      </div>
      <input
        type="range"
        min={MIN_VIDEO_TEXT_SIZE_SCALE}
        max={MAX_VIDEO_TEXT_SIZE_SCALE}
        step={VIDEO_TEXT_SIZE_SCALE_STEP}
        value={safe}
        onChange={(e) =>
          onChange(clampVideoTextSizeScale(Number(e.target.value)))
        }
        className="w-full accent-blue-600 dark:accent-blue-500"
        aria-label="Video text size scale"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {Math.round(MIN_VIDEO_TEXT_SIZE_SCALE * 100)}% —{" "}
          {Math.round(MAX_VIDEO_TEXT_SIZE_SCALE * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_VIDEO_TEXT_SIZE_SCALE)}
          className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          Reset to 100%
        </button>
      </div>
    </div>
  );
}
