"use client";

import { useEffect, useState } from "react";

export type TweaksState = {
  sidebarWidth: number; // in px, clamped 320..480
  density: "normal" | "compact";
  accentIndex: number; // index into ACCENTS
  previewToneIndex: number; // index into PREVIEW_TONES
};

/** 5 accent swatches — stored as "R G B" strings to match Tailwind alpha syntax. */
const ACCENTS: { label: string; rgb: string }[] = [
  { label: "Ocean", rgb: "59 111 212" }, // default #3b6fd4
  { label: "Violet", rgb: "131 92 226" },
  { label: "Emerald", rgb: "45 178 138" },
  { label: "Amber", rgb: "220 150 45" },
  { label: "Rose", rgb: "224 86 120" },
];

/** Preview ambient tones — "H S" pairs (combined with L inside globals.css). */
const PREVIEW_TONES: { label: string; hs: string }[] = [
  { label: "Cool", hs: "214 48%" },
  { label: "Neutral", hs: "220 12%" },
  { label: "Warm", hs: "28 50%" },
];

const STORAGE_KEY = "video-composer-tweaks-v1";

const DEFAULT_STATE: TweaksState = {
  sidebarWidth: 380,
  density: "normal",
  accentIndex: 0,
  previewToneIndex: 0,
};

function readState(): TweaksState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<TweaksState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

/** Apply CSS vars + data-* attributes to <html> whenever tweaks change. */
function applyTweaks(state: TweaksState): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--sidebar-w", `${state.sidebarWidth}px`);
  root.style.setProperty(
    "--accent-rgb",
    ACCENTS[state.accentIndex]?.rgb ?? ACCENTS[0]!.rgb,
  );
  root.style.setProperty(
    "--preview-tone",
    PREVIEW_TONES[state.previewToneIndex]?.hs ?? PREVIEW_TONES[0]!.hs,
  );
  root.dataset.density = state.density;
}

export function useTweaks() {
  const [state, setState] = useState<TweaksState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  // Hydrate once from localStorage.
  useEffect(() => {
    const next = readState();
    setState(next);
    applyTweaks(next);
    setReady(true);
  }, []);

  // Persist + apply on change.
  useEffect(() => {
    if (!ready) return;
    applyTweaks(state);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state, ready]);

  return { state, setState, ready };
}

type Props = {
  open: boolean;
  onClose: () => void;
  state: TweaksState;
  setState: (next: TweaksState) => void;
};

export function TweaksPanel({ open, onClose, state, setState }: Props) {
  if (!open) return null;

  return (
    <div
      className="glass-bar sticky bottom-0 z-10 border-t"
      role="dialog"
      aria-label="Tweaks"
    >
      <div className="space-y-3 px-3 py-3 text-slate-200 dark:text-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tweaks
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-100"
            aria-label="Close tweaks"
          >
            ✕
          </button>
        </div>

        <label className="flex flex-col gap-1 text-xs">
          <span className="flex items-center justify-between text-slate-400">
            Sidebar width <span className="text-slate-500">{state.sidebarWidth}px</span>
          </span>
          <input
            type="range"
            min={320}
            max={480}
            step={4}
            value={state.sidebarWidth}
            onChange={(e) =>
              setState({ ...state, sidebarWidth: Number(e.target.value) })
            }
            className="w-full accent-accent"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-xs">
          <span className="text-slate-400">Accent</span>
          <div className="grid grid-cols-5 gap-2">
            {ACCENTS.map((a, i) => {
              const active = state.accentIndex === i;
              return (
                <button
                  key={a.label}
                  type="button"
                  aria-label={a.label}
                  title={a.label}
                  onClick={() => setState({ ...state, accentIndex: i })}
                  className={`h-7 w-full rounded-lg border transition ${
                    active ? "border-white/60 ring-2 ring-white/20" : "border-white/10"
                  }`}
                  style={{ background: `rgb(${a.rgb})` }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <span className="text-slate-400">Preview tone</span>
          <div className="grid grid-cols-3 gap-2">
            {PREVIEW_TONES.map((t, i) => {
              const active = state.previewToneIndex === i;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setState({ ...state, previewToneIndex: i })}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? "border-accent/60 bg-accent-dim text-accent"
                      : "border-white/10 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">Compact density</span>
          <button
            type="button"
            role="switch"
            aria-checked={state.density === "compact"}
            onClick={() =>
              setState({
                ...state,
                density: state.density === "compact" ? "normal" : "compact",
              })
            }
            className={`relative h-5 w-10 rounded-full border transition ${
              state.density === "compact"
                ? "border-accent/60 bg-accent/60"
                : "border-white/15 bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                state.density === "compact" ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
