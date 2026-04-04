/** Ensures a valid #RRGGBB for inputs and native color pickers. */
export function normalizeHexColor(input: string, fallback: string): string {
  const t = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1]!;
    const g = t[2]!;
    const b = t[3]!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

/** Default on-screen text (headline + captions). */
export const DEFAULT_HEADLINE_COLOR_HEX = "#ffffff";

export const DEFAULT_CAPTION_COLOR_HEX = "#ffffff";
