/**
 * Renders a Remotion composition to an .mp4 on disk and returns the file path.
 *
 * Mirrors the render pipeline in `src/app/api/render/route.ts`, but instead of
 * streaming the video back over HTTP it writes it straight into a local folder
 * — useful for grabbing a video from the command line.
 *
 * Run with `npm run download` (defaults below), or import `downloadVideo`.
 */
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultBeforeAfterProps,
  defaultCarouselProps,
  defaultSingleImageProps,
} from "../src/remotion/Root";
import { remotionWebpackOverride } from "../src/remotion/webpack-override";
import type { BeforeAfterTemplateProps } from "../src/remotion/before-after-template";
import type { CarouselTemplateProps } from "../src/remotion/carousel-template";
import type { RemotionCompositionId } from "../src/remotion/composition-ids";
import type { SingleImageTemplateProps } from "../src/remotion/single-image-template";

type RenderInputProps =
  | BeforeAfterTemplateProps
  | SingleImageTemplateProps
  | CarouselTemplateProps;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Default download location (a local scratch folder). */
export const DEFAULT_OUTPUT_DIR = "/Users/yanguangchen/Documents/Workflows/tmp";

const defaultPropsByComposition: Record<RemotionCompositionId, RenderInputProps> = {
  BeforeAfter: defaultBeforeAfterProps,
  SingleImage: defaultSingleImageProps,
  Carousel: defaultCarouselProps,
};

export type DownloadVideoOptions = {
  /** Which composition to render. Defaults to "SingleImage". */
  compositionId?: RemotionCompositionId;
  /** Props passed to the composition. Defaults to that composition's defaults. */
  inputProps?: RenderInputProps;
  /** Directory to write the .mp4 into. Defaults to {@link DEFAULT_OUTPUT_DIR}. */
  outputDir?: string;
  /** File name (without extension). Defaults to `<compositionId>-<uuid>`. */
  fileName?: string;
  /** Optional progress callback (0–100). */
  onProgress?: (progress: number) => void;
};

/**
 * Renders the given composition and saves it as an .mp4 in `outputDir`.
 * Returns the absolute path of the written file.
 */
export async function downloadVideo(options: DownloadVideoOptions = {}): Promise<string> {
  const compositionId = options.compositionId ?? "SingleImage";
  const inputProps = options.inputProps ?? defaultPropsByComposition[compositionId];
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
  const fileName = options.fileName ?? `${compositionId}-${randomUUID()}`;

  const { bundle } = await import("@remotion/bundler");
  const { ensureBrowser, renderMedia, selectComposition } = await import("@remotion/renderer");

  const serveUrl = await bundle({
    entryPoint: path.join(root, "src/remotion/index.ts"),
    webpackOverride: remotionWebpackOverride,
    publicDir: path.join(root, "public"),
  });

  await ensureBrowser();

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${fileName}.mp4`);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    concurrency: 1,
    disallowParallelEncoding: true,
    chromiumOptions: {
      disableWebSecurity: true,
      enableMultiProcessOnLinux: false,
    },
    ffmpegOverride: ({ args }) => [...args, "-threads", "4"],
    onProgress: ({ progress }) => {
      options.onProgress?.(Math.round(progress * 100));
    },
  });

  return outputPath;
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const [compositionArg, outputDirArg] = process.argv.slice(2);
  const compositionId = (compositionArg as RemotionCompositionId | undefined) ?? "SingleImage";

  downloadVideo({
    compositionId,
    outputDir: outputDirArg,
    onProgress: (progress) => {
      process.stdout.write(`\rRendering ${compositionId}… ${progress}%`);
    },
  })
    .then((outputPath) => {
      process.stdout.write(`\nSaved video to ${outputPath}\n`);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
      process.stderr.write(`\n${message}\n`);
      process.exit(1);
    });
}
