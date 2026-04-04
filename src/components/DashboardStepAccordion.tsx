"use client";

import type { ReactNode } from "react";

/** Distinct tints for each step header (Tailwind palette). */
export type AccordionAccent =
  | "indigo"
  | "violet"
  | "sky"
  | "rose"
  | "emerald"
  | "amber"
  | "cyan"
  | "fuchsia"
  | "orange";

type AccentStyle = {
  sectionBorder: string;
  trigger: string;
  triggerOpen: string;
  chevron: string;
};

const ACCENT: Record<AccordionAccent, AccentStyle> = {
  indigo: {
    sectionBorder: "border-indigo-200/90 dark:border-indigo-500/35",
    trigger:
      "bg-gradient-to-r from-indigo-50 to-indigo-100/70 text-indigo-950 hover:from-indigo-100/90 hover:to-indigo-100 dark:from-indigo-950/70 dark:to-indigo-900/50 dark:text-indigo-100 dark:hover:from-indigo-900/80 dark:hover:to-indigo-800/50",
    triggerOpen:
      "from-indigo-100 to-indigo-100/80 text-indigo-950 dark:from-indigo-900/70 dark:to-indigo-900/50 dark:text-indigo-100",
    chevron: "text-indigo-600 dark:text-indigo-400",
  },
  violet: {
    sectionBorder: "border-violet-200/90 dark:border-violet-500/35",
    trigger:
      "bg-gradient-to-r from-violet-50 to-violet-100/70 text-violet-950 hover:from-violet-100/90 hover:to-violet-100 dark:from-violet-950/70 dark:to-violet-900/50 dark:text-violet-100 dark:hover:from-violet-900/80 dark:hover:to-violet-800/50",
    triggerOpen:
      "from-violet-100 to-violet-100/80 text-violet-950 dark:from-violet-900/70 dark:to-violet-900/50 dark:text-violet-100",
    chevron: "text-violet-600 dark:text-violet-400",
  },
  sky: {
    sectionBorder: "border-sky-200/90 dark:border-sky-500/35",
    trigger:
      "bg-gradient-to-r from-sky-50 to-sky-100/70 text-sky-950 hover:from-sky-100/90 hover:to-sky-100 dark:from-sky-950/70 dark:to-sky-900/50 dark:text-sky-100 dark:hover:from-sky-900/80 dark:hover:to-sky-800/50",
    triggerOpen:
      "from-sky-100 to-sky-100/80 text-sky-950 dark:from-sky-900/70 dark:to-sky-900/50 dark:text-sky-100",
    chevron: "text-sky-600 dark:text-sky-400",
  },
  rose: {
    sectionBorder: "border-rose-200/90 dark:border-rose-500/35",
    trigger:
      "bg-gradient-to-r from-rose-50 to-rose-100/70 text-rose-950 hover:from-rose-100/90 hover:to-rose-100 dark:from-rose-950/70 dark:to-rose-900/50 dark:text-rose-100 dark:hover:from-rose-900/80 dark:hover:to-rose-800/50",
    triggerOpen:
      "from-rose-100 to-rose-100/80 text-rose-950 dark:from-rose-900/70 dark:to-rose-900/50 dark:text-rose-100",
    chevron: "text-rose-600 dark:text-rose-400",
  },
  emerald: {
    sectionBorder: "border-emerald-200/90 dark:border-emerald-500/35",
    trigger:
      "bg-gradient-to-r from-emerald-50 to-emerald-100/70 text-emerald-950 hover:from-emerald-100/90 hover:to-emerald-100 dark:from-emerald-950/70 dark:to-emerald-900/50 dark:text-emerald-100 dark:hover:from-emerald-900/80 dark:hover:to-emerald-800/50",
    triggerOpen:
      "from-emerald-100 to-emerald-100/80 text-emerald-950 dark:from-emerald-900/70 dark:to-emerald-900/50 dark:text-emerald-100",
    chevron: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    sectionBorder: "border-amber-200/90 dark:border-amber-500/35",
    trigger:
      "bg-gradient-to-r from-amber-50 to-amber-100/70 text-amber-950 hover:from-amber-100/90 hover:to-amber-100 dark:from-amber-950/70 dark:to-amber-900/50 dark:text-amber-100 dark:hover:from-amber-900/80 dark:hover:to-amber-800/50",
    triggerOpen:
      "from-amber-100 to-amber-100/80 text-amber-950 dark:from-amber-900/70 dark:to-amber-900/50 dark:text-amber-100",
    chevron: "text-amber-700 dark:text-amber-400",
  },
  cyan: {
    sectionBorder: "border-cyan-200/90 dark:border-cyan-500/35",
    trigger:
      "bg-gradient-to-r from-cyan-50 to-cyan-100/70 text-cyan-950 hover:from-cyan-100/90 hover:to-cyan-100 dark:from-cyan-950/70 dark:to-cyan-900/50 dark:text-cyan-100 dark:hover:from-cyan-900/80 dark:hover:to-cyan-800/50",
    triggerOpen:
      "from-cyan-100 to-cyan-100/80 text-cyan-950 dark:from-cyan-900/70 dark:to-cyan-900/50 dark:text-cyan-100",
    chevron: "text-cyan-600 dark:text-cyan-400",
  },
  fuchsia: {
    sectionBorder: "border-fuchsia-200/90 dark:border-fuchsia-500/35",
    trigger:
      "bg-gradient-to-r from-fuchsia-50 to-fuchsia-100/70 text-fuchsia-950 hover:from-fuchsia-100/90 hover:to-fuchsia-100 dark:from-fuchsia-950/70 dark:to-fuchsia-900/50 dark:text-fuchsia-100 dark:hover:from-fuchsia-900/80 dark:hover:to-fuchsia-800/50",
    triggerOpen:
      "from-fuchsia-100 to-fuchsia-100/80 text-fuchsia-950 dark:from-fuchsia-900/70 dark:to-fuchsia-900/50 dark:text-fuchsia-100",
    chevron: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  orange: {
    sectionBorder: "border-orange-200/90 dark:border-orange-500/35",
    trigger:
      "bg-gradient-to-r from-orange-50 to-orange-100/70 text-orange-950 hover:from-orange-100/90 hover:to-orange-100 dark:from-orange-950/70 dark:to-orange-900/50 dark:text-orange-100 dark:hover:from-orange-900/80 dark:hover:to-orange-800/50",
    triggerOpen:
      "from-orange-100 to-orange-100/80 text-orange-950 dark:from-orange-900/70 dark:to-orange-900/50 dark:text-orange-100",
    chevron: "text-orange-600 dark:text-orange-400",
  },
};

type Props = {
  id: string;
  title: ReactNode;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  children: ReactNode;
  accent: AccordionAccent;
};

export function DashboardStepAccordion({
  id,
  title,
  openId,
  onOpenChange,
  children,
  accent,
}: Props) {
  const isOpen = openId === id;
  const a = ACCENT[accent];

  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:bg-slate-900/50 dark:shadow-slate-950/40 ${a.sectionBorder}`}
    >
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left shadow-sm transition-[background,box-shadow,transform] duration-200 hover:shadow-md active:translate-y-px active:shadow-sm ${isOpen ? `bg-gradient-to-r ${a.triggerOpen}` : a.trigger}`}
        onClick={() => onOpenChange(isOpen ? null : id)}
        aria-expanded={isOpen ? "true" : "false"}
        aria-controls={`step-panel-${id}`}
        id={`step-trigger-${id}`}
      >
        <span className="text-lg font-semibold">{title}</span>
        <span
          className={`shrink-0 transition-transform duration-300 ease-out ${a.chevron} ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="block"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`border-t border-slate-100/90 px-4 pb-4 pt-1 dark:border-slate-700/80 ${!isOpen ? "pointer-events-none" : ""}`}
            id={`step-panel-${id}`}
            role="region"
            aria-labelledby={`step-trigger-${id}`}
            aria-hidden={!isOpen}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
