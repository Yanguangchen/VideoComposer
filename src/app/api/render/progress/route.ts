import { getRenderProgress } from "@/lib/render-progress-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId")?.trim();
  if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
    return Response.json({ error: "Invalid or missing sessionId" }, { status: 400 });
  }

  const state = getRenderProgress(sessionId);
  if (!state) {
    return Response.json({
      progress: 0,
      label: "Waiting…",
      active: false,
    });
  }

  return Response.json({
    progress: state.progress,
    label: state.label,
    active: true,
  });
}
