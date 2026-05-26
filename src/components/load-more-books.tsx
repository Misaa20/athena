"use client";

import { useState } from "react";
import { BookCard } from "@/components/book-card";
import type { BookSearchResult } from "@/lib/books";

type Props = {
  subject: string;
  initialOffset: number;
  initialHasMore: boolean;
};

// Appends further pages of a genre below the server-rendered first page. Fetches
// from /api/browse/[subject] and grows the grid in place, so the user gets a
// real "view more" instead of a fixed shelf of ~15 books.
export function LoadMoreBooks({ subject, initialOffset, initialHasMore }: Props) {
  const [books, setBooks] = useState<BookSearchResult[]>([]);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Guard against duplicate covers across pages (rare, but keeps React keys safe).
  const seen = new Set(books.map((b) => b.externalId));

  async function loadMore() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/browse/${encodeURIComponent(subject)}?offset=${offset}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        books: BookSearchResult[];
        nextOffset: number;
        hasMore: boolean;
      };
      setBooks((prev) => [...prev, ...data.books.filter((b) => !seen.has(b.externalId))]);
      setOffset(data.nextOffset);
      setHasMore(data.hasMore);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {books.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {books.map((b) => (
            <BookCard
              key={b.externalId}
              externalId={b.externalId}
              title={b.title}
              authors={b.authors}
              coverUrl={b.coverUrl}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-md border border-ink-200 px-6 py-2.5 text-sm text-ink-900/80 transition hover:border-accent/50 hover:text-ink-900 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
          {error && (
            <p className="text-sm text-wine">Couldn’t load more right now. Try again.</p>
          )}
        </div>
      )}
    </>
  );
}
