import { defineConfig } from "vitest/config";

export default defineConfig({ esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/app/layout.tsx", "src/app/page.tsx", "src/remotion/index.ts"],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
