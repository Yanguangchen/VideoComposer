"use client";

import type { MediaAsset } from "@/config/background-music";

type Props = {
  backgroundOptions: MediaAsset[];
  musicOptions: MediaAsset[];
  backgroundPath: string | null;
  musicPath: string | null;
  onBackgroundChange: (publicPath: string | null) => void;
  onMusicChange: (publicPath: string | null) => void;
  mediaLoading: boolean;
};

export function BackgroundMusicControls({
  backgroundOptions,
  musicOptions,
  backgroundPath,
  musicPath,
  onBackgroundChange,
  onMusicChange,
  mediaLoading,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-slate-500">
        Drop files into{" "}
        <code className="rounded bg-slate-100 px-1">public/music/</code> and
        background folders (e.g.{" "}
        <code className="rounded bg-slate-100 px-1">public/background music/</code>
        ) — they are picked up automatically. Optional custom labels in{" "}
        <code className="rounded bg-slate-100 px-1">background-music.ts</code>.
      </p>

      {mediaLoading ? (
        <p className="text-xs text-slate-500">Scanning public folders…</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-800">
          Background video (or image)
        </label>
        <p className="text-xs text-slate-500">
          Full-screen backdrop. Use .mp4 / .webm for video, or .jpg / .webp for a
          still. Video plays muted so it does not clash with the music track.
        </p>
        <select
          value={backgroundPath ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onBackgroundChange(v === "" ? null : v);
          }}
          disabled={mediaLoading}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
        >
          <option value="">None — gradient only</option>
          {backgroundOptions.map((a) => (
            <option key={a.publicPath} value={a.publicPath}>
              {a.label}
            </option>
          ))}
        </select>
        {!mediaLoading && backgroundOptions.length === 0 ? (
          <p className="text-xs text-amber-800">
            No backdrop files found. Add .mp4 / .webm / .jpg / .webp under{" "}
            <code className="rounded bg-amber-100 px-1">public/background music/</code>,{" "}
            <code className="rounded bg-amber-100 px-1">public/background-videos/</code>, etc.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-800">
          Music
        </label>
        <p className="text-xs text-slate-500">
          Optional background music — separate from the backdrop video.
        </p>
        <select
          value={musicPath ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onMusicChange(v === "" ? null : v);
          }}
          disabled={mediaLoading}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
        >
          <option value="">None</option>
          {musicOptions.map((a) => (
            <option key={a.publicPath} value={a.publicPath}>
              {a.label}
            </option>
          ))}
        </select>
        {!mediaLoading && musicOptions.length === 0 ? (
          <p className="text-xs text-amber-800">
            No music found. Add .mp3 / .wav / .m4a under{" "}
            <code className="rounded bg-amber-100 px-1">public/music/</code>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
