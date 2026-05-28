"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Shelf } from "@/components/shelf";
import { authedFetch } from "@/lib/client";
import type { BookSearchResult } from "@/lib/books";

type Props = { subject: string; label: string };

// Per-user shelf on the genre page: more books in this genre by authors the
// signed-in reader already has in their library. Renders nothing for signed-out
// visitors or empty results, so the page degrades silently.
export function AuthorsInGenreShelf({ subject, label }: Props) {
  const { ready, authenticated } = usePrivy();
  const [books, setBooks] = useState<BookSearchResult[] | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await authedFetch<{ books: BookSearchResult[] }>(
          `/api/me/authors-in-subject?subject=${encodeURIComponent(subject)}`,
        );
        if (!cancelled) setBooks(data.books ?? []);
      } catch {
        if (!cancelled) setBooks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, subject]);

  if (!authenticated || !books || books.length === 0) return null;
  return (
    <Shelf
      title={`More ${label.toLowerCase()} by authors you’ve read`}
      subtitle="Drawn from the authors already on your shelves."
      books={books}
    />
  );
}
