"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { authedFetch } from "@/lib/client";
import type { Recommendation } from "@/lib/ai";

const examples = [
  "A quiet, philosophical novel under 300 pages",
  "Something like Ishiguro but funnier",
  "Nonfiction about memory that reads like a novel",
];

const sampleRecommendations = [
  {
    title: "Stoner",
    author: "John Williams",
    reason:
      "A spare, deeply interior campus novel for readers who want quiet emotional force without melodrama.",
  },
  {
    title: "The Uncommon Reader",
    author: "Alan Bennett",
    reason:
      "Short, dry, and humane. A good fit when you want literary wit without losing tenderness.",
  },
  {
    title: "A Month in the Country",
    author: "J.L. Carr",
    reason:
      "Under 200 pages, reflective, and beautifully restrained, with grief and restoration held in balance.",
  },
];

export default function LibrarianPage() {
  const { authenticated } = usePrivy();
  const [prompt, setPrompt] = useState("");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [usedLibrary, setUsedLibrary] = useState(0);
  const [asked, setAsked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function ask(value?: string) {
    const q = (value ?? prompt).trim();
    if (!q) return;
    setLoading(true);
    setError(false);
    setRecs([]);
    try {
      // authedFetch attaches the Privy token when signed in, so the server can
      // ground recommendations in the user's library.
      const data = await authedFetch<{ recommendations: Recommendation[]; usedLibrary: number }>(
        "/api/recommend",
        { method: "POST", body: JSON.stringify({ prompt: q }) },
      );
      setRecs(data.recommendations ?? []);
      setUsedLibrary(data.usedLibrary ?? 0);
      setAsked(true);
    } catch {
      // Network error / rate limit — tell the user instead of silently resetting.
      setError(true);
      setAsked(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="font-serif text-4xl text-ink-900">The librarian</h1>
        <p className="text-ink-900/60">Ask the way you’d ask a friend who reads more than you do.</p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="What are you in the mood for?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <Button onClick={() => ask()} disabled={loading}>
            {loading ? "Thinking…" : "Ask"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-ink-900/60">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setPrompt(ex);
                ask(ex);
              }}
              className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-wine">
          The librarian couldn’t answer just now — please try again in a moment.
        </p>
      )}

      {asked && (
        <p className="text-sm text-ink-900/50">
          {usedLibrary > 0
            ? `Tailored to the ${usedLibrary} book${usedLibrary > 1 ? "s" : ""} on your shelves.`
            : authenticated
              ? "Add books to your library to get recommendations based on what you’ve read."
              : "Sign in and build your library to get recommendations based on your reading."}
        </p>
      )}

      {!asked && recs.length === 0 && !loading && !error && (
        <section className="space-y-4 rounded-xl border border-ink-200 bg-ink-100/35 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">Example answer</p>
            <h2 className="mt-2 font-serif text-2xl text-ink-900">
              For &quot;a quiet, philosophical novel under 300 pages&quot;
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {sampleRecommendations.map((r) => (
              <Card key={r.title}>
                <CardTitle>{r.title}</CardTitle>
                <CardDescription className="mt-1 text-ink-900/60">{r.author}</CardDescription>
                <p className="mt-3 text-sm leading-relaxed text-ink-900/80">{r.reason}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {recs.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {recs.map((r, i) => (
            <Card key={i}>
              <CardTitle>{r.title}</CardTitle>
              <CardDescription className="mt-1 text-ink-900/60">{r.author}</CardDescription>
              <p className="mt-3 text-sm text-ink-900/80">{r.reason}</p>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
