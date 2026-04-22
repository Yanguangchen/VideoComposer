"use client";

import type { ReactNode } from "react";
import { useRender } from "@/hooks/useRender";
import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import type { RemotionCompositionId } from "@/remotion/composition-ids";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";
import { useToast } from "@/components/ui/Toast";

type Dot = {
  label: string;
  done: boolean;
};

type Props = {
  hasBrand: boolean;
  hasLogo: boolean;
  hasContent: boolean;
  canExport: boolean;
  compositionId: RemotionCompositionId;
  getInputProps: () => Promise<
    BeforeAfterTemplateProps | SingleImageTemplateProps | CarouselTemplateProps
  >;
  onBusyChange: (busy: boolean) => void;
};

function ProgressDot({ done, label }: Dot) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          done ? "bg-success shadow-[0_0_0_3px_rgb(var(--success-rgb)/0.2)]" : "bg-white/20"
        }`}
        aria-hidden
      />
      <span
        className={`text-[11px] font-medium tracking-wide transition-colors ${
          done ? "text-slate-200" : "text-slate-500"
        }`}
      >
        {label}
      </span>
    </span>
  );
}

function Chevron(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden className="opacity-60">
      <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExportBar({
  hasBrand,
  hasLogo,
  hasContent,
  canExport,
  compositionId,
  getInputProps,
  onBusyChange,
}: Props) {
  const toast = useToast();
  const render = useRender({ compositionId, getInputProps, onBusyChange });

  async function handleClick() {
    if (!canExport || render.isRendering) return;
    await render.start();
    if (render.lastError) {
      toast(render.lastError, "error");
    }
  }

  return (
    <div className="glass-bar sticky bottom-0 z-30 border-t" role="region" aria-label="Export">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 sm:gap-6">
        {/* Progress dots — hidden on mobile */}
        <div className="hidden items-center gap-3 md:flex">
          <ProgressDot done={hasBrand} label="Brand" />
          <Chevron />
          <ProgressDot done={hasLogo} label="Logo" />
          <Chevron />
          <ProgressDot done={hasContent} label="Photos" />
        </div>

        {/* Progress bar (while rendering) */}
        {render.isRendering ? (
          <div className="hidden min-w-0 flex-1 md:block" aria-live="polite">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-300 ease-out"
                style={{ width: `${render.progress}%` }}
              />
            </div>
            <p className="mt-1 truncate text-[11px] text-slate-400">
              {render.phaseLabel || "Working…"}
              {render.progress > 0 ? (
                <span className="text-slate-500"> · {render.progress}%</span>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <a
          href="https://wizards-dashboard.vercel.app/facebook.html"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold sm:inline-flex"
        >
          Facebook Pages
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M10 4h6v6" />
            <path d="M16 4L8 12" />
            <path d="M16 13v3H4V4h3" />
          </svg>
        </a>

        <button
          type="button"
          onClick={handleClick}
          disabled={!canExport || render.isRendering}
          className="btn-accent inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide transition"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M4 15h12" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {render.isRendering ? "Rendering…" : "Export MP4"}
        </button>
      </div>
    </div>
  );
}
