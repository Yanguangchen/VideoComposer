import { readdir } from "fs/promises";
import path from "path";
import { getBrandById } from "@/config/brands";
import { filterLogoFilenames } from "@/lib/brand-logos";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ brandId: string }> },
) {
  const { brandId } = await context.params;
  const brand = getBrandById(brandId);
  if (!brand) {
    return Response.json({ error: "Unknown brand" }, { status: 404 });
  }

  const dir = path.join(process.cwd(), "public", brand.logoFolder);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return Response.json(
      { files: [], folder: brand.logoFolder, message: "Folder missing or unreadable" },
      { status: 200 },
    );
  }

  const files = filterLogoFilenames(entries).sort((a, b) =>
    a.localeCompare(b),
  );

  return Response.json({
    files,
    folder: brand.logoFolder,
  });
}
