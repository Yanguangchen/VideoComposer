"use client";

import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

/**
 * Per-brand plaintext "context" that feeds the AI copy assistant.
 *
 * Stored at `brandContexts/{brandId}`. `text` is free-form — descriptions of
 * the brand, target audience, tone, signature services, offers, and anything
 * else the user wants Gemini to know before generating a post caption.
 */
export type BrandContext = {
  brandId: string;
  text: string;
  updatedAt: number | null;
};

const BRAND_CONTEXT_COLLECTION = "brandContexts";

/** Max characters allowed in a brand context. Prevents runaway Firestore docs. */
export const BRAND_CONTEXT_MAX_CHARS = 8000;

export function clampBrandContextText(text: string): string {
  if (text.length <= BRAND_CONTEXT_MAX_CHARS) return text;
  return text.slice(0, BRAND_CONTEXT_MAX_CHARS);
}

export async function getBrandContext(brandId: string): Promise<BrandContext> {
  const db = getDb();
  const snap = await getDoc(doc(db, BRAND_CONTEXT_COLLECTION, brandId));
  if (!snap.exists()) {
    return { brandId, text: "", updatedAt: null };
  }
  const data = snap.data();
  const ts = data.updatedAt as Timestamp | null;
  return {
    brandId,
    text: typeof data.text === "string" ? data.text : "",
    updatedAt: ts ? ts.toMillis() : null,
  };
}

/** Real-time subscription so edits in one tab show up in another. */
export function subscribeBrandContext(
  brandId: string,
  onNext: (ctx: BrandContext) => void,
  onError?: (err: Error) => void,
): () => void {
  const db = getDb();
  return onSnapshot(
    doc(db, BRAND_CONTEXT_COLLECTION, brandId),
    (snap) => {
      if (!snap.exists()) {
        onNext({ brandId, text: "", updatedAt: null });
        return;
      }
      const data = snap.data();
      const ts = data.updatedAt as Timestamp | null;
      onNext({
        brandId,
        text: typeof data.text === "string" ? data.text : "",
        updatedAt: ts ? ts.toMillis() : null,
      });
    },
    (err) => onError?.(err),
  );
}

export async function saveBrandContext(
  brandId: string,
  text: string,
): Promise<void> {
  const db = getDb();
  await setDoc(
    doc(db, BRAND_CONTEXT_COLLECTION, brandId),
    {
      brandId,
      text: clampBrandContextText(text),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
