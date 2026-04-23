"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  BRAND_CONTEXT_MAX_CHARS,
  saveBrandContext,
  subscribeBrandContext,
} from "@/lib/brand-context";
import { useToast } from "@/components/ui/Toast";

type Props = {
  brandId: string;
  brandLabel: string;
};

export function AiCopyAssistant({ brandId, brandLabel }: Props) {
  const configured = isFirebaseConfigured();
  const toast = useToast();

  const [contextText, setContextText] = useState("");
  const [originalContext, setOriginalContext] = useState("");
  const [loadingContext, setLoadingContext] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live-subscribe to the brand context so edits in another tab sync in.
  useEffect(() => {
    if (!configured) {
      setLoadingContext(false);
      return;
    }
    setLoadingContext(true);
    setContextError(null);
    let active = true;
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeBrandContext(
        brandId,
        (ctx) => {
          if (!active) return;
          // Don't clobber unsaved edits: only sync when the server value actually
          // matches what the user last saw saved.
          setOriginalContext((prevOriginal) => {
            setContextText((prevText) => {
              if (prevText === prevOriginal) return ctx.text;
              return prevText;
            });
            return ctx.text;
          });
          setLoadingContext(false);
        },
        (err) => {
          if (!active) return;
          setContextError(err.message);
          setLoadingContext(false);
        },
      );
    } catch (err) {
      setContextError(err instanceof Error ? err.message : String(err));
      setLoadingContext(false);
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [brandId, configured]);

  // Reset output / prompt when the brand changes so copy isn't mis-attributed.
  useEffect(() => {
    setPrompt("");
    setOutput("");
    setGenerateError(null);
    setCopied(false);
  }, [brandId]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const dirty = contextText !== originalContext;

  const handleSaveContext = useCallback(async () => {
    if (!configured || !dirty) return;
    setSaving(true);
    try {
      await saveBrandContext(brandId, contextText);
      setOriginalContext(contextText);
      toast("Brand context saved", "success");
    } catch (err) {
      toast(
        `Couldn't save: ${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  }, [brandId, configured, contextText, dirty, toast]);

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setGenerateError("Write a prompt first.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    setOutput("");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandLabel,
          brandContext: contextText,
          userPrompt: trimmed,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (!data.text) {
        throw new Error("Empty response from Gemini.");
      }
      setOutput(data.text);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }, [brandLabel, contextText, prompt]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Couldn't access the clipboard — copy manually.", "error");
    }
  }, [output, toast]);

  if (!configured) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-semibold">Firebase not configured</p>
        <p className="mt-1 text-xs">
          Brand contexts are stored in Firestore. Set the{" "}
          <code>NEXT_PUBLIC_FIREBASE_*</code> env vars to enable the AI copy
          assistant. See <code>docs/media-library-setup.md</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          AI copy assistant for{" "}
          <span className="font-semibold">{brandLabel}</span>. Describe the
          brand once — Gemini reuses it for every caption.
        </p>
      </div>

      {/* Brand context editor */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Brand context
          </span>
          <span className="text-[11px] text-slate-500">
            {contextText.length}/{BRAND_CONTEXT_MAX_CHARS}
          </span>
        </div>
        <textarea
          value={contextText}
          onChange={(e) =>
            setContextText(e.target.value.slice(0, BRAND_CONTEXT_MAX_CHARS))
          }
          rows={6}
          disabled={loadingContext}
          placeholder={
            loadingContext
              ? "Loading…"
              : "Signature services, target audience, brand voice, seasonal offers, location, etc."
          }
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {contextError ? (
          <p className="text-xs text-red-400">{contextError}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveContext}
            disabled={!dirty || saving || loadingContext}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : dirty ? "Save context" : "Saved"}
          </button>
          {dirty ? (
            <span className="text-[11px] text-slate-500">Unsaved changes</span>
          ) : null}
        </div>
      </div>

      {/* Prompt + generate */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Your prompt
        </span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Write a Mother's Day promo caption for our signature facial, 20% off this weekend only."
          className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate caption"}
          </button>
          <span className="text-[11px] text-slate-500">Gemini 2.5 Flash</span>
        </div>
        {generateError ? (
          <p className="text-xs text-red-400">{generateError}</p>
        ) : null}
      </div>

      {/* Output */}
      {output ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Caption
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="scrollbar-soft max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-sans text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-100">
            {output}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
