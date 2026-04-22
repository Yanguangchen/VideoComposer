"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastItem = {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
};

type Ctx = {
  show: (message: string, tone?: ToastItem["tone"]) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback<Ctx["show"]>((message, tone = "info") => {
    idRef.current += 1;
    const id = idRef.current;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed left-1/2 top-4 z-[200] flex -translate-x-1/2 flex-col gap-2"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-md ${
              t.tone === "success"
                ? "border border-emerald-400/30 bg-emerald-500/20 text-emerald-50"
                : t.tone === "error"
                  ? "border border-red-400/30 bg-red-500/20 text-red-50"
                  : "border border-white/15 bg-slate-900/70 text-slate-100"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx["show"] {
  const ctx = useContext(ToastCtx);
  // Silent no-op fallback so component trees without a provider don't crash.
  return ctx?.show ?? (() => {});
}

export function useToastSignal() {
  /* re-export of useToast to keep ergonomic "const toast = useToastSignal()" in call sites */
  return useToast();
}

// Handy: run a side-effect once when `trigger` toggles to true.
export function useWhenTrue(trigger: boolean, effect: () => void) {
  useEffect(() => {
    if (trigger) effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
}
