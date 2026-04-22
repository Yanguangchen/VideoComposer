/** Fixed ambient backdrop — mount once per page. Colors come from CSS vars
 *  (`--accent-rgb`) so the TweaksPanel can swap them at runtime. */
export function BackgroundScene() {
  return <div aria-hidden className="bg-scene" />;
}
