/** Parse `{ error: string }` or plain text from failed render API responses. */
export async function parseRenderErrorResponse(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: unknown };
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
  } catch {
    // not JSON
  }
  const trimmed = text.trim();
  if (trimmed) return trimmed;
  return `Request failed (${res.status})`;
}
