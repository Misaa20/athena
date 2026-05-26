"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { authedFetch } from "@/lib/client";

type Personality = {
  readerType: string | null;
  tasteProfile: string | null;
  tasteUpdatedAt: string | null;
};

// Dashboard widget: the AI-generated reading personality, with a button to
// generate or refresh it. The signature hook of the app.
export function PersonalityCard() {
  const [data, setData] = useState<Personality | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authedFetch<Personality>("/api/me/personality")
      .then(setData)
      .catch(() => setData({ readerType: null, tasteProfile: null, tasteUpdatedAt: null }));
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch<Personality>("/api/me/personality", { method: "POST" });
      setData(res);
    } catch (e) {
      const msg = (e as Error).message;
      setError(
        msg.includes("need_books")
          ? "Add a few books to your shelves first, then Athena can read your taste."
          : "Couldn’t generate right now. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }

  const hasProfile = data?.readerType && data?.tasteProfile;

  return (
    <div className="relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-ink-100/80 to-ink-100/30 p-6 shadow-glow backdrop-blur">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2 text-accent">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs uppercase tracking-[0.2em]">Your reading personality</span>
        </div>

        {hasProfile ? (
          <>
            <h3 className="font-serif text-2xl text-ink-900">{data!.readerType}</h3>
            <p className="mt-2 max-w-2xl text-ink-900/80">{data!.tasteProfile}</p>
            <button
              onClick={generate}
              disabled={loading}
              className="mt-4 text-sm text-accent hover:underline disabled:opacity-50"
            >
              {loading ? "Reading your shelves…" : "Refresh"}
            </button>
          </>
        ) : (
          <>
            <h3 className="font-serif text-2xl text-ink-900">What kind of reader are you?</h3>
            <p className="mt-2 max-w-2xl text-ink-900/70">
              Let Athena read your shelves and name your reader type — your themes, your tastes, the
              adventure you might take next.
            </p>
            <button
              onClick={generate}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink-50 transition hover:bg-accent-dark disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Reading your shelves…" : "Reveal my reading personality"}
            </button>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
