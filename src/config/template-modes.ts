import type { RemotionCompositionId } from "@/remotion/composition-ids";

export const TEMPLATE_MODES = [
  {
    id: "before-after" as const,
    label: "Before / After",
    shortLabel: "Before / After",
    description:
      "Two photos — ideal for beauty, hair, and transformation results.",
  },
  {
    id: "single-image" as const,
    label: "Single image",
    shortLabel: "Single image",
    description:
      "One hero photo — for promos, products, or non–before/after services.",
  },
  {
    id: "carousel" as const,
    label: "Carousel",
    shortLabel: "Carousel",
    description:
      "Multiple images cycle in the video — each with its own title.",
  },
] as const;

export type TemplateModeId = (typeof TEMPLATE_MODES)[number]["id"];

export const DEFAULT_TEMPLATE_MODE: TemplateModeId = "before-after";

export function templateModeToCompositionId(
  mode: TemplateModeId,
): RemotionCompositionId {
  if (mode === "single-image") return "SingleImage";
  if (mode === "carousel") return "Carousel";
  return "BeforeAfter";
}
