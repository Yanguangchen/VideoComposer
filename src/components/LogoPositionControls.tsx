"use client";

import {
  clampLogoOffset,
  DEFAULT_LOGO_OFFSET_X_PX,
  DEFAULT_LOGO_OFFSET_Y_PX,
  LOGO_OFFSET_STEP_PX,
  MAX_LOGO_OFFSET_PX,
  MIN_LOGO_OFFSET_PX,
} from "@/config/logo-offset";

type Props = {
  offsetXPx: number;
  offsetYPx: number;
  onOffsetXChange: (v: number) => void;
  onOffsetYChange: (v: number) => void;
  disabled?: boolean;
};

export function LogoPositionControls({
  offsetXPx,
  offsetYPx,
  onOffsetXChange,
  onOffsetYChange,
  disabled,
}: Props) {
  const x = clampLogoOffset(offsetXPx);
  const y = clampLogoOffset(offsetYPx);

  return (
    <div
      className={`mt-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/40 ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        Logo position
      </span>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
          Horizontal · {x}px
        </span>
        <input
          type="range"
          min={MIN_LOGO_OFFSET_PX}
          max={MAX_LOGO_OFFSET_PX}
          step={LOGO_OFFSET_STEP_PX}
          value={x}
          onChange={(e) =>
            onOffsetXChange(clampLogoOffset(Number(e.target.value)))
          }
          className="w-full accent-blue-600 dark:accent-blue-500"
          aria-label="Logo horizontal offset"
          disabled={disabled}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
          Vertical · {y}px
        </span>
        <input
          type="range"
          min={MIN_LOGO_OFFSET_PX}
          max={MAX_LOGO_OFFSET_PX}
          step={LOGO_OFFSET_STEP_PX}
          value={y}
          onChange={(e) =>
            onOffsetYChange(clampLogoOffset(Number(e.target.value)))
          }
          className="w-full accent-blue-600 dark:accent-blue-500"
          aria-label="Logo vertical offset"
          disabled={disabled}
        />
      </label>
      <button
        type="button"
        onClick={() => {
          onOffsetXChange(DEFAULT_LOGO_OFFSET_X_PX);
          onOffsetYChange(DEFAULT_LOGO_OFFSET_Y_PX);
        }}
        disabled={disabled}
        className="self-start text-xs font-medium text-blue-700 hover:underline disabled:no-underline dark:text-blue-400"
      >
        Reset position
      </button>
    </div>
  );
}
