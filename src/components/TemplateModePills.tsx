"use client";

import {
  TEMPLATE_MODES,
  type TemplateModeId,
} from "@/config/template-modes";

type Props = {
  value: TemplateModeId;
  onChange: (mode: TemplateModeId) => void;
};

function ModeIcon({ mode }: { mode: TemplateModeId }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (mode === "before-after") {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="8" rx="1.5" />
        <rect x="4" y="13" width="16" height="8" rx="1.5" />
        <path d="M12 11v2" />
      </svg>
    );
  }
  if (mode === "single-image") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 16l5-5 4 4 3-3 6 6" />
        <circle cx="8.5" cy="9.5" r="1.3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="6" width="12" height="12" rx="1.75" />
      <rect x="17" y="8" width="4" height="8" rx="1.25" opacity="0.55" />
    </svg>
  );
}

export function TemplateModePills({ value, onChange }: Props) {
  return (
    <div
      className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-100/60 p-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]"
      role="radiogroup"
      aria-label="Video layout"
    >
      {TEMPLATE_MODES.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.id)}
            className={`group flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center transition ${
              active
                ? "bg-accent-dim text-accent shadow-accent-glow"
                : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-white/[0.05]"
            }`}
            title={m.description}
          >
            <ModeIcon mode={m.id} />
            <span className="truncate text-[11px] font-semibold leading-tight">
              {m.shortLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
