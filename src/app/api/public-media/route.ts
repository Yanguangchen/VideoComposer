import { scanPublicMedia } from "@/lib/scan-public-media";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { music, backgrounds } = await scanPublicMedia();
    return Response.json({ music, backgrounds });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Failed to scan public media", music: [], backgrounds: [] },
      { status: 500 },
    );
  }
}
