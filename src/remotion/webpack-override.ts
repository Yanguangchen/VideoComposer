import path from "node:path";
import type { WebpackOverrideFn } from "@remotion/bundler";

/** Same `paths` as `tsconfig.json` — Remotion's webpack does not read Next.js config. */
export const remotionWebpackOverride: WebpackOverrideFn = (config) => {
  const src = path.join(process.cwd(), "src");
  config.resolve = config.resolve ?? {};
  const existing = config.resolve.alias;
  const alias =
    typeof existing === "object" &&
    existing !== null &&
    !Array.isArray(existing)
      ? { ...existing }
      : {};
  alias["@"] = src;
  config.resolve.alias = alias;
  return config;
};
