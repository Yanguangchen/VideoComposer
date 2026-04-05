import type { FC } from "react";

type Props = {
  showPriceTag: boolean;
  priceTagText: string;
  fontFamily: string;
  color: string;
  fontSize: number;
  brandTitleFontId: string;
};

/** Pill-style price under the subtitle when enabled. */
export const PriceTagBadge: FC<Props> = ({
  showPriceTag,
  priceTagText,
  fontFamily,
  color,
  fontSize,
  brandTitleFontId,
}) => {
  if (!showPriceTag || !priceTagText.trim()) return null;
  const fw = brandTitleFontId === "bebas-neue" ? 400 : 700;
  return (
    <div
      style={{
        fontFamily,
        color,
        fontSize,
        fontWeight: fw,
        textAlign: "center",
        padding: "22px 56px",
        borderRadius: 26,
        backgroundColor: "rgba(255,255,255,0.16)",
        border: "3px solid rgba(255,255,255,0.4)",
        textShadow: "0 3px 16px rgba(0,0,0,0.4)",
        letterSpacing: "0.02em",
        lineHeight: 1.2,
        maxWidth: "100%",
      }}
    >
      {priceTagText.trim()}
    </div>
  );
};
