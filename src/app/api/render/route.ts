import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import type { BeforeAfterTemplateProps } from "@/remotion/before-after-template";
import type { CarouselTemplateProps } from "@/remotion/carousel-template";
import type { RemotionCompositionId } from "@/remotion/composition-ids";
import type { SingleImageTemplateProps } from "@/remotion/single-image-template";
import { remotionWebpackOverride } from "@/remotion/webpack-override";

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

export async function POST(req: Request) {
  let outputPath: string | null = null;
  try {
    const body = (await req.json()) as {
      compositionId?: RemotionCompositionId;
      inputProps?: BeforeAfterTemplateProps | SingleImageTemplateProps | CarouselTemplateProps;
    };
    const compositionId = body.compositionId;
    const inputProps = body.inputProps;

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

    const { renderMedia, selectComposition } = await import(
      "@remotion/renderer"
    );
    const serveUrl = await getBundleUrl();
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps,
    });

    outputPath = path.join(tmpdir(), `remotion-${randomUUID()}.mp4`);

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
    });

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
    const message = e instanceof Error ? e.message : "Render failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (outputPath) await unlink(outputPath).catch(() => {});
  }
}
