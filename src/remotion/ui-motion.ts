import { Easing, interpolate } from "remotion";

/** Default keyframe lengths; scaled down for very short compositions. */
function scaledFrames(totalFrames: number) {
  const t = Math.max(1, totalFrames);
  const scale = Math.min(1, t / 72);
  return {
    enter: Math.max(10, Math.round(18 * scale)),
    exit: Math.max(10, Math.round(22 * scale)),
    stagger: Math.max(4, Math.round(8 * scale)),
  };
}

export type UiLayerMotion = {
  opacity: number;
  translateY: number;
};

/**
 * Staggered enter (fade + slide up) and exit (fade + slide up) for on-screen UI.
 *
 * - **enterDelay** — frames before this layer starts animating in (stack top → bottom).
 * - **exitOrder** — larger = begins leaving earlier (top/title exits first).
 */
export function uiLayerMotion(
  frame: number,
  durationInFrames: number,
  enterDelay: number,
  exitOrder: number,
): UiLayerMotion {
  const total = Math.max(1, durationInFrames);
  const { enter: enterLen, exit: exitLen, stagger } = scaledFrames(total);

  const enterT = interpolate(
    frame,
    [enterDelay, enterDelay + enterLen],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  const exitLead = exitOrder * stagger;
  const exitEnd = Math.max(0, total - 1 - exitLead);
  let exitStart = Math.max(enterDelay + enterLen, exitEnd - exitLen);
  if (exitStart >= exitEnd) {
    exitStart = Math.max(0, exitEnd - Math.min(exitLen, exitEnd));
  }
  if (exitStart >= exitEnd && exitEnd > 0) {
    exitStart = exitEnd - 1;
  }
  const exitT = interpolate(frame, [exitStart, exitEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  const opacity = enterT * exitT;

  const enterY = interpolate(enterT, [0, 1], [52, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitY = interpolate(exitT, [0, 1], [-40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return {
    opacity,
    translateY: enterY + exitY,
  };
}
