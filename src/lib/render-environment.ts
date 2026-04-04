/**
 * Remotion export needs FFmpeg + headless Chrome on the Node host.
 * Default serverless platforms (Vercel, Netlify, AWS Lambda) do not ship these.
 */

export function getServerlessExportBlockMessage(): string | null {
  if (process.env.REMOTION_ALLOW_EXPORT_ON_SERVERLESS === "1") {
    return null;
  }
  if (process.env.VERCEL) {
    return (
      "MP4 export is not supported on Vercel’s serverless runtime: FFmpeg and Remotion’s headless browser are not available there. " +
      "Deploy this app with Docker (see README → Production deployment) on Railway, Fly.io, Render, a VPS, or use Remotion Lambda for cloud rendering."
    );
  }
  if (process.env.NETLIFY) {
    return (
      "MP4 export is not supported on Netlify Functions. Deploy with Docker or another Node host that includes FFmpeg (see README)."
    );
  }
  return null;
}
