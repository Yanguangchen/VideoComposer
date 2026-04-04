/**
 * Bundles the Remotion entry the same way as /api/render.
 * Run with `npm run verify:remotion` — independent of `next build`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { remotionWebpackOverride } from "../src/remotion/webpack-override";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

bundle({
  entryPoint: path.join(root, "src/remotion/index.ts"),
  webpackOverride: remotionWebpackOverride,
  publicDir: path.join(root, "public"),
})
  .then((serveUrl) => {
    process.stdout.write(`Remotion bundle OK: ${serveUrl}\n`);
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
