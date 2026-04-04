"use client";

import {
  DEFAULT_TEMPLATE_MODE,
  TEMPLATE_MODES,
  type TemplateModeId,
} from "@/config/template-modes";

type Props = {
  value: TemplateModeId;
  onChange: (mode: TemplateModeId) => void;
};

export function TemplateModeToggle({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-800">
        Video layout
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TEMPLATE_MODES.map((m) => {
          const active = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`flex flex-1 flex-col rounded-xl border-2 px-4 py-3 text-left transition ${
                active
                  ? "border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className={`text-sm font-bold ${
                  active ? "text-blue-900" : "text-slate-800"
                }`}
              >
                {m.shortLabel}
              </span>
              <span className="mt-1 text-xs text-slate-600">{m.description}</span>
            </button>
          );
        })}
      </div>
      {value === DEFAULT_TEMPLATE_MODE ? null : (
        <p className="text-xs text-slate-500">
          {value === "single-image"
            ? "Single-image mode uses one upload and hides the before/after pair."
            : "Carousel cycles through slides — each with its own image and title."}
        </p>
      )}
    </div>
  );
}
