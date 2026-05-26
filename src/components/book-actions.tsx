"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { authedFetch } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Catalog payload mirrors BookPayload on the server (lib/book-store.ts). Sent
// when the book isn't in our DB yet so the server can upsert it on demand.
export type BookActionPayload = {
  externalId?: string;
  isbn13?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  pageCount?: number;
  publishedYear?: number;
  genres: string[];
};

type Status = "WANT_TO_READ" | "READING" | "FINISHED" | "DNF";

const SHELVES: { value: Status; label: string }[] = [
  { value: "WANT_TO_READ", label: "Want to read" },
  { value: "READING", label: "Reading" },
  { value: "FINISHED", label: "Read" },
  { value: "DNF", label: "DNF" },
];

type Props = {
  /** Known DB id (set on the in-library book page). */
  bookId?: string;
  /** Catalog payload (set on the external book page). */
  book: BookActionPayload;
};

export function BookActions({ bookId, book }: Props) {
  const privyConfigured = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyConfigured) {
    return (
      <div className="rounded-md border border-ink-200 bg-ink-100 p-4 text-sm text-ink-900/70">
        Sign-in isn’t configured, so shelves and reviews are disabled.
      </div>
    );
  }
  return <Inner bookId={bookId} book={book} />;
}

function Inner({ bookId, book }: Props) {
  const { ready, authenticated, login } = usePrivy();
  const lookupKey = bookId ?? book.externalId ?? "";

  const [status, setStatus] = useState<Status | null>(null);
  const [savingShelf, setSavingShelf] = useState<Status | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [hasReview, setHasReview] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [quoteBody, setQuoteBody] = useState("");
  const [quotePage, setQuotePage] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the user's existing shelf + review for this book once authenticated.
  useEffect(() => {
    if (!authenticated || !lookupKey) return;
    const param = bookId ? `bookId=${bookId}` : `externalId=${encodeURIComponent(book.externalId!)}`;
    authedFetch<{ entry: { status: Status; rating: number | null } | null; review: { rating: number; body: string } | null }>(
      `/api/me/book?${param}`,
    )
      .then((data) => {
        if (data.entry) setStatus(data.entry.status);
        if (data.review) {
          setReviewRating(data.review.rating);
          setReviewBody(data.review.body);
          setHasReview(true);
        }
      })
      .catch(() => {});
  }, [authenticated, lookupKey, bookId, book.externalId]);

  if (!ready) {
    return <p className="text-sm text-ink-900/40">Loading…</p>;
  }

  if (!authenticated) {
    return (
      <div className="rounded-md border border-ink-200 bg-ink-100 p-4">
        <p className="text-sm text-ink-900/70">Sign in to shelve this book, rate it, and write a review.</p>
        <Button className="mt-3" onClick={() => login()}>
          Sign in
        </Button>
      </div>
    );
  }

  async function setShelf(next: Status) {
    setError(null);
    setMessage(null);
    setSavingShelf(next);
    try {
      await authedFetch("/api/library", {
        method: "POST",
        body: JSON.stringify(bookId ? { bookId, status: next } : { book, status: next }),
      });
      setStatus(next);
      setMessage(`Saved to “${SHELVES.find((s) => s.value === next)?.label}”.`);
    } catch (e) {
      setError((e as Error).message || "Couldn’t save. Try again.");
    } finally {
      setSavingShelf(null);
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (reviewRating < 1) {
      setError("Pick a rating first.");
      return;
    }
    if (!reviewBody.trim()) {
      setError("Write a few words for your review.");
      return;
    }
    setSavingReview(true);
    try {
      await authedFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify(
          bookId
            ? { bookId, rating: reviewRating, body: reviewBody.trim() }
            : { book, rating: reviewRating, body: reviewBody.trim() },
        ),
      });
      setHasReview(true);
      setMessage("Review saved.");
    } catch (e) {
      setError((e as Error).message || "Couldn’t save your review.");
    } finally {
      setSavingReview(false);
    }
  }

  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!quoteBody.trim()) {
      setError("Type the quote first.");
      return;
    }
    setSavingQuote(true);
    try {
      const page = quotePage.trim() ? Number(quotePage) : undefined;
      await authedFetch("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          ...(bookId ? { bookId } : { book }),
          body: quoteBody.trim(),
          ...(page && page > 0 ? { page } : {}),
        }),
      });
      setQuoteBody("");
      setQuotePage("");
      setMessage("Quote saved to your wall.");
    } catch (e) {
      setError((e as Error).message || "Couldn’t save the quote.");
    } finally {
      setSavingQuote(false);
    }
  }

  return (
    <div className="space-y-5 rounded-lg border border-ink-200 p-4">
      <div>
        <p className="mb-2 text-sm font-medium text-ink-900">Add to your shelves</p>
        <div className="flex flex-wrap gap-2">
          {SHELVES.map((s) => (
            <button
              key={s.value}
              onClick={() => setShelf(s.value)}
              disabled={savingShelf !== null}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-50",
                status === s.value
                  ? "border-ink-900 bg-ink-900 text-ink-50"
                  : "border-ink-200 text-ink-900/70 hover:bg-ink-100",
              )}
            >
              {savingShelf === s.value ? "Saving…" : s.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submitReview} className="space-y-3 border-t border-ink-200 pt-4">
        <p className="text-sm font-medium text-ink-900">
          {hasReview ? "Your review" : "Write a review"}
        </p>
        <StarPicker value={reviewRating} onChange={setReviewRating} />
        <textarea
          value={reviewBody}
          onChange={(e) => setReviewBody(e.target.value)}
          placeholder="What did you think?"
          rows={4}
          className="w-full rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-900"
        />
        <Button type="submit" disabled={savingReview}>
          {savingReview ? "Saving…" : hasReview ? "Update review" : "Post review"}
        </Button>
      </form>

      <form onSubmit={submitQuote} className="space-y-3 border-t border-ink-200 pt-4">
        <p className="text-sm font-medium text-ink-900">Save a quote</p>
        <textarea
          value={quoteBody}
          onChange={(e) => setQuoteBody(e.target.value)}
          placeholder="A line worth keeping…"
          rows={3}
          className="w-full rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-900"
        />
        <div className="flex items-center gap-2">
          <input
            value={quotePage}
            onChange={(e) => setQuotePage(e.target.value)}
            inputMode="numeric"
            placeholder="Page (optional)"
            className="h-9 w-36 rounded-md border border-ink-200 bg-ink-50 px-3 text-sm text-ink-900 outline-none focus:border-ink-900"
          />
          <Button type="submit" variant="outline" disabled={savingQuote}>
            {savingQuote ? "Saving…" : "Add to quotes wall"}
          </Button>
        </div>
      </form>

      {message && <p className="text-sm text-accent">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className={cn(
            "text-2xl leading-none transition",
            n <= active ? "text-accent" : "text-ink-200",
          )}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
