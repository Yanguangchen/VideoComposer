"use client";

import type { Brand } from "@/config/brands";

type Props = {
  brands: Brand[];
  activeBrandId: string;
  onSelect: (id: string) => void;
};

export function BrandSelector({ brands, activeBrandId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {brands.map((b) => {
        const active = activeBrandId === b.id;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id)}
            title={b.displayName}
            className={`min-w-0 break-words rounded-lg border px-3 py-2.5 text-center text-xs font-semibold uppercase leading-tight tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 ${
              active
                ? "border-accent/60 bg-accent-dim text-accent shadow-accent-glow"
                : "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/[0.07]"
            }`}
          >
            {b.displayName}
          </button>
        );
      })}
    </div>
  );
}
