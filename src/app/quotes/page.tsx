"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Trash2 } from "lucide-react";
import { QuoteCard } from "@/components/quote-card";
import { Button } from "@/components/ui/button";
import { authedFetch } from "@/lib/client";

type Quote = {
  id: string;
  body: string;
  page: number | null;
  createdAt: string;
  book: { id: string; title: string; authors: string[]; coverUrl: string | null };
};

export default function QuotesPage() {
  const { ready, authenticated, login } = usePrivy();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    authedFetch<{ quotes: Quote[] }>("/api/quotes")
      .then((d) => setQuotes(d.quotes ?? []))
      .catch(() => setQuotes([]));
  }, [authenticated]);

  async function remove(id: string) {
    setQuotes((qs) => qs?.filter((q) => q.id !== id) ?? null);
    try {
      await authedFetch(`/api/quotes?id=${id}`, { method: "DELETE" });
    } catch {
      // best-effort; a reload will resync
    }
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-4xl text-ink-900">Your quotes wall</h1>
        <p className="mt-2 text-ink-900/60">
          The lines worth keeping. Add quotes from any book’s page.
        </p>
      </header>

      {ready && !authenticated ? (
        <div className="rounded-md border border-ink-200 bg-ink-100 p-4">
          <p className="text-sm text-ink-900/70">Sign in to collect quotes.</p>
          <Button className="mt-3" onClick={() => login()}>
            Sign in
          </Button>
        </div>
      ) : quotes === null ? (
        <p className="text-ink-900/50">Loading…</p>
      ) : quotes.length === 0 ? (
        <p className="text-ink-900/60">
          No quotes yet. Open a book and use “Add a quote” to start your wall.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {quotes.map((q) => (
            <div key={q.id} className="group relative">
              <QuoteCard body={q.body} page={q.page} book={q.book} />
              <button
                onClick={() => remove(q.id)}
                aria-label="Delete quote"
                className="absolute right-3 top-3 rounded-md p-1.5 text-ink-900/30 opacity-0 transition hover:bg-ink-200/40 hover:text-wine group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-ink-900/50">
        Looking for a book to quote? <Link href="/library" className="text-accent hover:underline">Go to your library →</Link>
      </p>
    </div>
  );
}
