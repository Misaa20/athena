"use client";

import { RotateCw } from "lucide-react";

// A simple "reload this page" control. Used on graceful-failure pages (e.g. a
// book whose catalog lookup timed out) where the right recovery is just to try
// the same request again. An empty <a href=""> does NOT reliably do this on
// catch-all routes, so we reload explicitly.
export function RetryButton({ label = "Try again" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm text-ink-50 shadow-glow transition hover:bg-accent-dark"
    >
      <RotateCw className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
