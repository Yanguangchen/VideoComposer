"use client";

import type { Brand } from "@/config/brands";

type Props = {
  brands: Brand[];
  activeBrandId: string;
  onSelect: (id: string) => void;
};

export function BrandSelector({ brands, activeBrandId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-100 p-6 dark:bg-slate-800/80 md:grid-cols-3">
      {brands.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onSelect(b.id)}
          className={`rounded-md px-4 py-6 text-center text-sm font-semibold uppercase shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-blue-300 md:text-base ${
            activeBrandId === b.id
              ? "bg-blue-900 text-white ring-2 ring-blue-400"
              : "bg-blue-700 text-white hover:bg-blue-800"
          }`}
        >
          {b.displayName}
        </button>
      ))}
    </div>
  );
}
