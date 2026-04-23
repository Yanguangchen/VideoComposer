export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_BRAND_CONTEXT_CHARS = 8000;
const MAX_USER_PROMPT_CHARS = 2000;

type GenerateBody = {
  brandName?: unknown;
  brandContext?: unknown;
  userPrompt?: unknown;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

function clampString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function buildPrompt(args: {
  brandName: string;
  brandContext: string;
  userPrompt: string;
}): string {
  const { brandName, brandContext, userPrompt } = args;
  return [
    "You are a social media copywriter writing Facebook and Instagram captions.",
    "Write in the voice of the brand below. Output PLAIN TEXT ONLY — no markdown,",
    "no code fences, no leading bullets. Use line breaks for paragraphs. Include",
    "a short hook, the main message, a call to action, and 4–8 relevant hashtags",
    "on the last line. Keep it under 600 characters unless the user asks otherwise.",
    "",
    `Brand: ${brandName || "(unnamed)"}`,
    "",
    "Brand context:",
    brandContext || "(no brand context provided)",
    "",
    "User request:",
    userPrompt,
  ].join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Gemini is not configured on the server. Set GEMINI_API_KEY and redeploy.",
      },
      { status: 503 },
    );
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const brandName = clampString(body.brandName, 200);
  const brandContext = clampString(body.brandContext, MAX_BRAND_CONTEXT_CHARS);
  const userPrompt = clampString(body.userPrompt, MAX_USER_PROMPT_CHARS);

  if (!userPrompt) {
    return Response.json(
      { error: "Write a prompt for the AI (e.g. 'Promote our Mother's Day offer')." },
      { status: 400 },
    );
  }

  const prompt = buildPrompt({ brandName, brandContext, userPrompt });

  let upstream: Response;
  try {
    upstream = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `Couldn't reach Gemini: ${message}` },
      { status: 502 },
    );
  }

  const data = (await upstream.json().catch(() => null)) as GeminiResponse | null;

  if (!upstream.ok) {
    const upstreamMessage = data?.error?.message ?? `HTTP ${upstream.status}`;
    return Response.json(
      { error: `Gemini error: ${upstreamMessage}` },
      { status: upstream.status === 429 ? 429 : 502 },
    );
  }

  if (data?.promptFeedback?.blockReason) {
    return Response.json(
      {
        error: `Gemini refused the request (${data.promptFeedback.blockReason}). Try rewording the brand context or prompt.`,
      },
      { status: 422 },
    );
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    return Response.json(
      { error: "Gemini returned an empty response. Try a different prompt." },
      { status: 502 },
    );
  }

  return Response.json({ text });
}
