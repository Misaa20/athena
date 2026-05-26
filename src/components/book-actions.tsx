"use client";

import { useEffect, useState } from "react";
import { Heart, Eye, EyeOff, Check } from "lucide-react";
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [customShelves, setCustomShelves] = useState<
    { id: string; name: string; isPublic: boolean }[]
  >([]);
  const [onShelves, setOnShelves] = useState<Set<string>>(new Set());
  const [savingCustomShelf, setSavingCustomShelf] = useState<string | null>(null);
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
    authedFetch<{
      entry: { status: Status; rating: number | null; isFavorite?: boolean } | null;
      review: { rating: number; body: string } | null;
      shelves?: { id: string; name: string; isPublic: boolean }[];
      onShelves?: string[];
    }>(`/api/me/book?${param}`)
      .then((data) => {
        if (data.entry) {
          setStatus(data.entry.status);
          setIsFavorite(Boolean(data.entry.isFavorite));
        }
        if (data.review) {
          setReviewRating(data.review.rating);
          setReviewBody(data.review.body);
          setHasReview(true);
        }
        if (data.shelves) setCustomShelves(data.shelves);
        if (data.onShelves) setOnShelves(new Set(data.onShelves));
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

  async function toggleFavorite() {
    setError(null);
    setMessage(null);
    setSavingFavorite(true);
    const next = !isFavorite;
    try {
      await authedFetch("/api/me/favorites", {
        method: "POST",
        body: JSON.stringify({ value: next, ...(bookId ? { bookId } : { book }) }),
      });
      setIsFavorite(next);
      // Favoriting auto-creates a WANT_TO_READ entry server-side if the book
      // wasn't shelved yet — mirror that locally so the shelf buttons sync.
      if (next && !status) setStatus("WANT_TO_READ");
      setMessage(next ? "Added to favorites." : "Removed from favorites.");
    } catch (e) {
      setError((e as Error).message || "Couldn't update favorite.");
    } finally {
      setSavingFavorite(false);
    }
  }

  async function toggleCustomShelf(shelfId: string) {
    setError(null);
    setMessage(null);
    setSavingCustomShelf(shelfId);
    const isOn = onShelves.has(shelfId);
    try {
      if (isOn) {
        // For DELETE we need an actual bookId, so resolve via the same upsert
        // path POST takes. Cheat: POST to library first (idempotent) if no bookId,
        // then DELETE. Simpler: only allow remove when we already have a bookId.
        if (!bookId) {
          // We need a bookId to remove. Add to library first to resolve one,
          // then DELETE. (POST is idempotent in practice for the shelf endpoint.)
          setError("Add the book to a shelf first to manage custom shelves.");
          return;
        }
        await authedFetch(`/api/me/shelves/${shelfId}/books?bookId=${bookId}`, {
          method: "DELETE",
        });
      } else {
        await authedFetch(`/api/me/shelves/${shelfId}/books`, {
          method: "POST",
          body: JSON.stringify(bookId ? { bookId } : { book }),
        });
      }
      setOnShelves((prev) => {
        const next = new Set(prev);
        if (isOn) next.delete(shelfId);
        else next.add(shelfId);
        return next;
      });
    } catch (e) {
      setError((e as Error).message || "Couldn't update shelf.");
    } finally {
      setSavingCustomShelf(null);
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
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink-900">Add to your shelves</p>
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={savingFavorite}
            aria-pressed={isFavorite}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition disabled:opacity-60",
              isFavorite
                ? "border-wine/50 bg-wine/15 text-wine"
                : "border-ink-200 text-ink-900/65 hover:border-wine/40 hover:text-wine",
            )}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5 transition",
                isFavorite ? "fill-wine text-wine" : "group-hover:scale-110",
              )}
            />
            {isFavorite ? "Favorite" : "Favorite"}
          </button>
        </div>
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

      {customShelves.length > 0 && (
        <div className="border-t border-ink-200 pt-4">
          <p className="mb-2 text-sm font-medium text-ink-900">My shelves</p>
          <div className="flex flex-wrap gap-2">
            {customShelves.map((s) => {
              const on = onShelves.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleCustomShelf(s.id)}
                  disabled={savingCustomShelf !== null}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-50",
                    on
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-ink-200 text-ink-900/70 hover:border-accent/40 hover:text-ink-900",
                  )}
                  title={s.isPublic ? "Public shelf" : "Private shelf"}
                >
                  {on && <Check className="h-3 w-3" />}
                  <span>{s.name}</span>
                  {s.isPublic ? (
                    <Eye className="h-2.5 w-2.5 opacity-60" />
                  ) : (
                    <EyeOff className="h-2.5 w-2.5 opacity-60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
