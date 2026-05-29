"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/book-card";
import { MyShelves } from "@/components/my-shelves";
import { authedFetch } from "@/lib/client";
import type { BookSearchResult } from "@/lib/books";

type Tab = "all" | "reading" | "finished" | "want";

type Entry = {
  id: string;
  status: "WANT_TO_READ" | "READING" | "FINISHED" | "DNF";
  rating: number | null;
  book: {
    id: string;
    title: string;
    authors: string[];
    coverUrl: string | null;
  };
};

const TAB_STATUS: Record<Exclude<Tab, "all">, Entry["status"]> = {
  reading: "READING",
  finished: "FINISHED",
  want: "WANT_TO_READ",
};

// Wrap the content in Suspense: useSearchParams() requires a Suspense boundary
// during static generation, or the build fails.
export default function LibraryPage() {
  return (
    <Suspense fallback={<p className="text-ink-900/50">Loading…</p>}>
      <LibraryContent />
    </Suspense>
  );
}

function LibraryContent() {
  const { ready, authenticated, login } = usePrivy();
  const searchParams = useSearchParams();
  // A search routed in from the command palette (⌘K) or a shared link arrives as
  // ?q=… — seed the box from it and run the search on arrival.
  const urlQuery = searchParams.get("q") ?? "";
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingShelves, setLoadingShelves] = useState(false);

  const loadShelves = useCallback(async () => {
    setLoadingShelves(true);
    try {
      const data = await authedFetch<{ entries: Entry[] }>("/api/library");
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoadingShelves(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadShelves();
  }, [authenticated, loadShelves]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results: BookSearchResult[] };
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run the search when arriving with ?q= (command palette / shared link), and
  // again whenever that param changes while the page is already mounted.
  useEffect(() => {
    if (urlQuery.trim()) {
      setQuery(urlQuery);
      runSearch(urlQuery);
    }
  }, [urlQuery, runSearch]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  const visible = tab === "all" ? entries : entries.filter((e) => e.status === TAB_STATUS[tab]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-4xl text-ink-900">Your library</h1>
        <p className="mt-2 text-ink-900/60">Every book you’ve loved, lived with, or want to.</p>
      </header>

      <form onSubmit={onSearch} className="flex gap-2">
        <Input
          placeholder="Search for a book to add — try ‘Stoner’ or ‘Ishiguro’"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {results.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-2xl text-ink-900">Search results</h2>
          <p className="mb-4 text-sm text-ink-900/50">
            Open a book to add it to a shelf, rate it, or review it.
          </p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
            {results.map((b) => (
              <BookCard
                key={b.externalId}
                externalId={b.externalId}
                title={b.title}
                authors={b.authors}
                coverUrl={b.coverUrl}
              />
            ))}
          </div>
        </section>
      )}

      {authenticated && (
        <>
          <hr className="rule-gold" />
          <MyShelves />
          <hr className="rule-gold" />
        </>
      )}

      <section>
        <div className="mb-4 flex gap-2 text-sm">
          {(["all", "reading", "finished", "want"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 ${
                tab === t ? "bg-ink-900 text-ink-50" : "text-ink-900/60 hover:bg-ink-100"
              }`}
            >
              {labelFor(t)}
            </button>
          ))}
        </div>

        {!ready ? (
          <p className="text-ink-900/50">Loading…</p>
        ) : !authenticated ? (
          <div className="rounded-md border border-ink-200 bg-ink-100 p-4">
            <p className="text-sm text-ink-900/70">Sign in to see and build your shelves.</p>
            <Button className="mt-3" onClick={() => login()}>
              Sign in
            </Button>
          </div>
        ) : loadingShelves ? (
          <p className="text-ink-900/50">Loading your shelves…</p>
        ) : visible.length === 0 ? (
          <p className="text-ink-900/60">
            {tab === "all"
              ? "No books yet. Search above, open one, and add it to a shelf."
              : `Nothing on this shelf yet.`}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6">
            {visible.map((e) => (
              <BookCard
                key={e.id}
                id={e.book.id}
                title={e.book.title}
                authors={e.book.authors}
                coverUrl={e.book.coverUrl}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function labelFor(t: Tab) {
  switch (t) {
    case "all":
      return "All";
    case "reading":
      return "Reading";
    case "finished":
      return "Finished";
    case "want":
      return "Want to read";
  }
}
