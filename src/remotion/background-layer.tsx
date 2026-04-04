import type { CSSProperties, FC } from "react";
import { Img, Video } from "remotion";
import { resolveMediaSrc } from "@/remotion/media-utils";

export function isBackgroundVideoSrc(src: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/i.test(src);
}

const bgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  opacity: 0.35,
};

type Props = {
  bgSrc: string;
};

/** Full-bleed background: image (jpg/webp/…) or muted looping video. */
export const BackgroundLayer: FC<Props> = ({ bgSrc }) => {
  const resolved = resolveMediaSrc(bgSrc);
  if (isBackgroundVideoSrc(bgSrc)) {
    return (
      <Video
        src={resolved}
        style={bgStyle}
        muted
        volume={0}
        loop
      />
    );
  }
  return <Img src={resolved} style={bgStyle} />;
};
