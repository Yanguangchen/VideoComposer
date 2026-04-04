export const SERVICE_FONT_OPTIONS = [
  { id: "inter", label: "Inter" },
  { id: "montserrat", label: "Montserrat" },
  { id: "oswald", label: "Oswald" },
  { id: "playfair-display", label: "Playfair Display" },
  { id: "lato", label: "Lato" },
  { id: "roboto", label: "Roboto" },
  { id: "bebas-neue", label: "Bebas Neue" },
  { id: "dancing-script", label: "Dancing Script" },
] as const;

export type ServiceFontId = (typeof SERVICE_FONT_OPTIONS)[number]["id"];

/** Default for brand title, service line, and carousel captions. */
export const DEFAULT_SERVICE_FONT_ID: ServiceFontId = "montserrat";

export function isServiceFontId(id: string): id is ServiceFontId {
  return SERVICE_FONT_OPTIONS.some((o) => o.id === id);
}
