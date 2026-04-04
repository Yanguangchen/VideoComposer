/**
 * In-memory render progress for `sessionId` (POST + GET polling).
 * Works when the same Node process handles both requests (typical `next dev` / `next start`).
 */

export type RenderProgressSnapshot = {
  progress: number;
  label: string;
};

const store = new Map<string, RenderProgressSnapshot & { updatedAt: number }>();

const TTL_MS = 15 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [id, v] of store) {
    if (now - v.updatedAt > TTL_MS) store.delete(id);
  }
}

export function setRenderProgress(
  sessionId: string,
  update: Partial<RenderProgressSnapshot>,
) {
  prune();
  const prev = store.get(sessionId);
  const next: RenderProgressSnapshot & { updatedAt: number } = {
    progress: update.progress ?? prev?.progress ?? 0,
    label: update.label ?? prev?.label ?? "Starting…",
    updatedAt: Date.now(),
  };
  store.set(sessionId, next);
}

export function getRenderProgress(
  sessionId: string,
): RenderProgressSnapshot | null {
  prune();
  const v = store.get(sessionId);
  if (!v) return null;
  return { progress: v.progress, label: v.label };
}

export function clearRenderProgress(sessionId: string) {
  store.delete(sessionId);
}
