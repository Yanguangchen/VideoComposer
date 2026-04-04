import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
