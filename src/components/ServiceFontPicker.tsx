"use client";

import {
  DEFAULT_SERVICE_FONT_ID,
  SERVICE_FONT_OPTIONS,
  type ServiceFontId,
} from "@/config/service-fonts";

type Props = {
  value: ServiceFontId;
  onChange: (id: ServiceFontId) => void;
  /** Defaults to service / caption copy. */
  label?: string;
  description?: string;
};

export function ServiceFontPicker({
  value,
  onChange,
  label = "Service / caption font",
  description = "Scroll the list to pick a typeface (same fonts load in the exported video).",
}: Props) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <select
        size={6}
        value={value}
        onChange={(e) => {
          const id = e.target.value as ServiceFontId;
          onChange(
            SERVICE_FONT_OPTIONS.some((o) => o.id === id)
              ? id
              : DEFAULT_SERVICE_FONT_ID,
          );
        }}
        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/60"
      >
        {SERVICE_FONT_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
