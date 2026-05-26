"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type Ctx = {
  push: (kind: ToastKind, message: string) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  // Safe fallback if used outside provider (won't crash the page).
  return (
    ctx ?? {
      push: (_k: ToastKind, _m: string) => {
        if (typeof window !== "undefined") console.warn("Toast used without provider");
      },
    }
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3800);
  }, []);

  // Expose imperative API on window for non-React callers (e.g. lib funcs).
  useEffect(() => {
    (window as unknown as { __toast?: Ctx["push"] }).__toast = push;
    return () => {
      delete (window as unknown as { __toast?: Ctx["push"] }).__toast;
    };
  }, [push]);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex w-[min(22rem,90vw)] flex-col gap-2">
        {items.map((t) => (
          <ToastView key={t.id} toast={t} onClose={() => setItems((s) => s.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastView({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? AlertCircle : Info;
  const color =
    toast.kind === "success" ? "text-accent" : toast.kind === "error" ? "text-wine" : "text-ink-900/70";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-100/95 px-4 py-3 shadow-glow backdrop-blur",
        "animate-slide-down",
      )}
      role="status"
    >
      <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", color)} />
      <p className="flex-1 text-sm text-ink-900">{toast.message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="text-ink-900/40 transition hover:text-ink-900"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
