"use client";

import {
  clampDurationSeconds,
  DEFAULT_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
} from "@/config/video-duration";

type Props = {
  durationSeconds: number;
  onChange: (seconds: number) => void;
};

export function VideoDurationControl({ durationSeconds, onChange }: Props) {
  const safe = clampDurationSeconds(durationSeconds);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">
        Total duration of the exported MP4. Carousel mode uses at least one
        segment per slide; if that is longer than your choice, the video
        extends to fit all slides.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-2">
          <span className="text-xs font-medium text-slate-700">
            {safe.toFixed(1)} seconds
          </span>
          <input
            type="range"
            min={MIN_DURATION_SECONDS}
            max={MAX_DURATION_SECONDS}
            step={0.5}
            value={safe}
            onChange={(e) =>
              onChange(clampDurationSeconds(Number(e.target.value)))
            }
            className="w-full accent-blue-600"
          />
          <span className="text-[11px] text-slate-400">
            {MIN_DURATION_SECONDS}s — {MAX_DURATION_SECONDS}s
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-700">Exact</span>
          <input
            type="number"
            min={MIN_DURATION_SECONDS}
            max={MAX_DURATION_SECONDS}
            step={0.5}
            value={safe}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) {
                onChange(clampDurationSeconds(v));
              }
            }}
            className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => onChange(DEFAULT_DURATION_SECONDS)}
        className="self-start text-xs font-medium text-blue-700 hover:underline"
      >
        Reset to {DEFAULT_DURATION_SECONDS}s default
      </button>
    </div>
  );
}
