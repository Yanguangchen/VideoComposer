import type { ServiceFontId } from "@/config/service-fonts";

/** CSS `font-family` values (must match Google Fonts names). */
export const SERVICE_FONT_CSS: Record<ServiceFontId, string> = {
  inter: "Inter",
  montserrat: "Montserrat",
  oswald: "Oswald",
  "playfair-display": "Playfair Display",
  lato: "Lato",
  roboto: "Roboto",
  "bebas-neue": "Bebas Neue",
  "dancing-script": "Dancing Script",
};

/** Mutable tuple so `@remotion/google-fonts` loadFont accepts `subsets` (not `readonly`). */
const latin = {
  subsets: ["latin"] as ("latin")[],
};

/** Weights used in templates: headlines often use 800; service/caption use 700. */
const wStandard = ["400", "700", "800"] as const;

/** Load all service-title fonts once (parallel). Call before first frame via delayRender. */
export function preloadAllServiceFonts(): Promise<void> {
  return Promise.all([
    import("@remotion/google-fonts/Inter").then(({ loadFont }) =>
      loadFont("normal", { ...latin, weights: [...wStandard] }).waitUntilDone(),
    ),
    import("@remotion/google-fonts/Montserrat").then(({ loadFont }) =>
      loadFont("normal", { ...latin, weights: [...wStandard] }).waitUntilDone(),
    ),
    import("@remotion/google-fonts/Oswald").then(({ loadFont }) =>
      loadFont("normal", { ...latin, weights: ["700"] }).waitUntilDone(),
    ),
    import("@remotion/google-fonts/PlayfairDisplay").then(({ loadFont }) =>
      loadFont("normal", { ...latin, weights: ["700"] }).waitUntilDone(),
    ),
    import("@remotion/google-fonts/Lato").then(({ loadFont }) =>
      loadFont("normal", { ...latin, weights: ["400", "700"] }).waitUntilDone(),
    ),
    import("@remotion/google-fonts/Roboto").then(({ loadFont }) =>
      loadFont("normal", { ...latin, weights: ["400", "700"] }).waitUntilDone(),
    ),
    import("@remotion/google-fonts/BebasNeue").then(({ loadFont }) =>
      loadFont("normal", { ...latin, weights: ["400"] }).waitUntilDone(),
    ),
    import("@remotion/google-fonts/DancingScript").then(({ loadFont }) =>
      loadFont("normal", { ...latin, weights: ["700"] }).waitUntilDone(),
    ),
  ]).then(() => undefined);
}
