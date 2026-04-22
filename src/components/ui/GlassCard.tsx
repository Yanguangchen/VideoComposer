"use client";

import { type ReactNode, useId } from "react";

export type SectionBadge = "required" | "done" | "optional";

type Props = {
  id: string;
  title: ReactNode;
  /** Tiny right-aligned pill — optional. */
  badge?: SectionBadge | null;
  /** Short helper text under the title when collapsed. */
  hint?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** When true, renders a static (non-collapsible) card. */
  alwaysOpen?: boolean;
  strongBorder?: boolean;
};

function Badge({ kind }: { kind: SectionBadge }) {
  if (kind === "required") {
    return <span className="badge-pill badge-required">Required</span>;
  }
  if (kind === "done") {
    return (
      <span className="badge-pill badge-done">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5A1 1 0 015.7 9.3L8.5 12l6.8-6.7a1 1 0 011.4 0z" />
        </svg>
        Done
      </span>
    );
  }
  return <span className="badge-pill badge-optional">Optional</span>;
}

export function GlassCard({
  id,
  title,
  badge,
  hint,
  open,
  onToggle,
  children,
  alwaysOpen = false,
  strongBorder = false,
}: Props) {
  const reactId = useId();
  const panelId = `gc-${reactId}-${id}`;

  if (alwaysOpen) {
    return (
      <section className={`glass-card ${strongBorder ? "glass-card--strong" : ""}`}>
        <header className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-slate-100 dark:text-slate-100">
              {title}
            </h3>
          </div>
          {badge ? <Badge kind={badge} /> : null}
        </header>
        <div className="px-4 pb-4">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={`glass-card overflow-hidden ${strongBorder ? "glass-card--strong" : ""}`}
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open ? "true" : "false"}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide text-slate-100 dark:text-slate-100">
              {title}
            </span>
            {badge ? <Badge kind={badge} /> : null}
          </span>
          {hint && !open ? (
            <span className="truncate text-xs text-slate-400 dark:text-slate-400">
              {hint}
            </span>
          ) : null}
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          className={`shrink-0 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={`collapse-grid ${open ? "collapse-grid--open" : "collapse-grid--closed"}`}
      >
        <div>
          <div
            id={panelId}
            role="region"
            aria-hidden={!open}
            className={`border-t border-white/[0.06] px-4 pb-4 pt-3 ${!open ? "pointer-events-none" : ""}`}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
