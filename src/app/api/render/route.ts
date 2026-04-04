import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import type { RemotionCompositionId } from "@/remotion/composition-ids";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";
import { remotionWebpackOverride } from "@/remotion/webpack-override";
import { formatRenderError } from "@/lib/render-error";
import { getServerlessExportBlockMessage } from "@/lib/render-environment";
import {
  clearRenderProgress,
  setRenderProgress,
} from "@/lib/render-progress-store";

export const runtime = "nodejs";
export const maxDuration = 300;

let cachedBundle: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (cachedBundle) return cachedBundle;
  const { bundle } = await import("@remotion/bundler");
  const entry = path.join(process.cwd(), "src/remotion/index.ts");
  cachedBundle = await bundle({
    entryPoint: entry,
    webpackOverride: remotionWebpackOverride,
    publicDir: path.join(process.cwd(), "public"),
  });
  return cachedBundle;
}

function validateInput(
  compositionId: RemotionCompositionId,
  inputProps: BeforeAfterTemplateProps | SingleImageTemplateProps | CarouselTemplateProps,
): string | null {
  if (compositionId === "BeforeAfter") {
    const p = inputProps as BeforeAfterTemplateProps;
    if (!p.topImageSrc || !p.bottomImageSrc) {
      return "Missing before or after image.";
    }
  } else if (compositionId === "SingleImage") {
    const p = inputProps as SingleImageTemplateProps;
    if (!p.imageSrc) {
      return "Missing image.";
    }
  } else {
    const p = inputProps as CarouselTemplateProps;
    if (!p.slides?.length) {
      return "Add at least one slide.";
    }
    const missing = p.slides.some((s) => !s.imageSrc);
    if (missing) {
      return "Each slide needs an image.";
    }
  }
  return null;
}

function isValidSessionId(id: unknown): id is string {
  return typeof id === "string" && id.length >= 8 && id.length <= 128;
}

export async function POST(req: Request) {
  let outputPath: string | null = null;
  let sessionId: string | undefined;
  try {
    const body = (await req.json()) as {
      compositionId?: RemotionCompositionId;
      inputProps?: BeforeAfterTemplateProps | SingleImageTemplateProps | CarouselTemplateProps;
      sessionId?: string;
    };
    const compositionId = body.compositionId;
    const inputProps = body.inputProps;
    sessionId = isValidSessionId(body.sessionId) ? body.sessionId : undefined;

    if (!compositionId || !inputProps) {
      return Response.json(
        { error: "Missing compositionId or inputProps" },
        { status: 400 },
      );
    }

    if (
      compositionId !== "BeforeAfter" &&
      compositionId !== "SingleImage" &&
      compositionId !== "Carousel"
    ) {
      return Response.json({ error: "Invalid compositionId" }, { status: 400 });
    }

    const validationError = validateInput(compositionId, inputProps);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const serverlessBlock = getServerlessExportBlockMessage();
    if (serverlessBlock) {
      return Response.json({ error: serverlessBlock }, { status: 503 });
    }

    if (sessionId) {
      setRenderProgress(sessionId, {
        progress: 0,
        label: "Preparing…",
      });
    }

    const { ensureBrowser, renderMedia, selectComposition } = await import(
      "@remotion/renderer"
    );

    if (sessionId) {
      setRenderProgress(sessionId, {
        progress: 3,
        label: "Bundling Remotion project (first run may take a minute)…",
      });
    }
    const serveUrl = await getBundleUrl();

    if (sessionId) {
      setRenderProgress(sessionId, {
        progress: 6,
        label: "Preparing headless browser (first time may download Chromium)…",
      });
    }
    await ensureBrowser();

    if (sessionId) {
      setRenderProgress(sessionId, {
        progress: 8,
        label: "Loading composition…",
      });
    }
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps,
    });

    outputPath = path.join(tmpdir(), `remotion-${randomUUID()}.mp4`);

    if (sessionId) {
      setRenderProgress(sessionId, {
        progress: 10,
        label: "Rendering video…",
      });
    }

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress, stitchStage }) => {
        if (!sessionId) return;
        const pct = 10 + Math.round(progress * 90);
        const label =
          stitchStage === "muxing"
            ? "Muxing audio and video…"
            : "Rendering frames…";
        setRenderProgress(sessionId, {
          progress: Math.min(99, pct),
          label,
        });
      },
    });

    if (sessionId) {
      setRenderProgress(sessionId, {
        progress: 100,
        label: "Finalizing…",
      });
    }

    const { readFile } = await import("fs/promises");
    const buf = await readFile(outputPath);
    await unlink(outputPath).catch(() => {});
    outputPath = null;

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="video.mp4"',
      },
    });
  } catch (e) {
    console.error(e);
    if (sessionId) {
      setRenderProgress(sessionId, {
        progress: 0,
        label: "Failed",
      });
    }
    const message = formatRenderError(e);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (sessionId) {
      clearRenderProgress(sessionId);
    }
    if (outputPath) await unlink(outputPath).catch(() => {});
  }
}
