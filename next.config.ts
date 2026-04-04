import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  /** Avoid wrong tracing root when multiple lockfiles exist on the machine. */
  outputFileTracingRoot: projectRoot,
  transpilePackages: [
    "remotion",
    "@remotion/player",
    "@remotion/google-fonts",
  ],
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "esbuild",
    "@rspack/core",
  ],
};

export default nextConfig;
