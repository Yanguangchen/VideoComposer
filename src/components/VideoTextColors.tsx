"use client";

import {
  DEFAULT_CAPTION_COLOR_HEX,
  DEFAULT_HEADLINE_COLOR_HEX,
  normalizeHexColor,
} from "@/lib/hex-color";

type Props = {
  headlineColorHex: string;
  captionColorHex: string;
  /** Value used for reset (default: white). */
  defaultHeadlineHex: string;
  onHeadlineChange: (hex: string) => void;
  onCaptionChange: (hex: string) => void;
};

export function VideoTextColors({
  headlineColorHex,
  captionColorHex,
  defaultHeadlineHex,
  onHeadlineChange,
  onCaptionChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Video text colors
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Main headline is the large title at the top; caption is the service
          line or slide titles (where applicable).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            Headline color
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={normalizeHexColor(headlineColorHex, defaultHeadlineHex)}
              onChange={(e) => onHeadlineChange(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
            />
            <input
              type="text"
              value={headlineColorHex}
              onChange={(e) => onHeadlineChange(e.target.value)}
              placeholder={DEFAULT_HEADLINE_COLOR_HEX}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              spellCheck={false}
            />
          </div>
          <button
            type="button"
            onClick={() => onHeadlineChange(defaultHeadlineHex)}
            className="text-left text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            Reset to white
          </button>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            Caption color
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={normalizeHexColor(
                captionColorHex,
                DEFAULT_CAPTION_COLOR_HEX,
              )}
              onChange={(e) => onCaptionChange(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
            />
            <input
              type="text"
              value={captionColorHex}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder={DEFAULT_CAPTION_COLOR_HEX}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              spellCheck={false}
            />
          </div>
        </label>
      </div>
    </div>
  );
}
