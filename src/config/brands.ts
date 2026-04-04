export type Brand = {
  id: string;
  displayName: string;
  /** Tailwind text-* class for dashboard labels (also paired with hex for inline use) */
  primaryColor: string;
  /** Inline color for Remotion + dynamic UI */
  primaryHex: string;
  /**
   * Folder under `public/` containing this brand’s logo files (png/svg/jpg/webp).
   * Example: `assets/logos/le-motor` → files in `public/assets/logos/le-motor/`.
   */
  logoFolder: string;
};

export const brands: Brand[] = [
  {
    id: "le-motor",
    displayName: "LE MOTOR",
    primaryColor: "text-blue-600",
    primaryHex: "#2563eb",
    logoFolder: "assets/logos/le-motor",
  },
  {
    id: "vskin",
    displayName: "VSKIN",
    primaryColor: "text-teal-600",
    primaryHex: "#0d9488",
    logoFolder: "assets/logos/vskin",
  },
  {
    id: "shebella-jurong",
    displayName: "SHEBELLA JURONG",
    primaryColor: "text-pink-500",
    primaryHex: "#ec4899",
    logoFolder: "assets/logos/shebella-jurong",
  },
  {
    id: "rains-coco",
    displayName: "RAINS & COCO",
    primaryColor: "text-amber-600",
    primaryHex: "#d97706",
    logoFolder: "assets/logos/rains-coco",
  },
  {
    id: "angel-nails",
    displayName: "ANGEL NAILS",
    primaryColor: "text-purple-600",
    primaryHex: "#9333ea",
    logoFolder: "assets/logos/angel-nails",
  },
  {
    id: "kuts-kurls",
    displayName: "KUTS AND KURLS",
    primaryColor: "text-emerald-600",
    primaryHex: "#059669",
    logoFolder: "assets/logos/kuts-kurls",
  },
  {
    id: "oscar-leasing",
    displayName: "OSCAR LEASING",
    primaryColor: "text-indigo-600",
    primaryHex: "#4f46e5",
    logoFolder: "assets/logos/oscar-leasing",
  },
  {
    id: "e-perfect-eyebrow",
    displayName: "E-PERFECT EYEBROW",
    primaryColor: "text-rose-500",
    primaryHex: "#f43f5e",
    logoFolder: "assets/logos/e-perfect-eyebrow",
  },
  {
    id: "vibrant-employment",
    displayName: "VIBRANT EMPLOYMENT",
    primaryColor: "text-lime-600",
    primaryHex: "#65a30d",
    logoFolder: "assets/logos/vibrant-employment",
  },
];

export function getBrandById(id: string): Brand | undefined {
  return brands.find((b) => b.id === id);
}

/** Public URL path to a file inside the brand’s logo folder (leading slash). */
export function brandLogoPublicUrl(brand: Brand, filename: string): string {
  const safe = filename.replace(/^\/+/, "");
  return `/${brand.logoFolder}/${safe}`;
}
