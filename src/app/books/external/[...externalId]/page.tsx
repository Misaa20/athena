import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { getBookByExternalId } from "@/lib/books";
import { db } from "@/lib/db";
import { StarRating } from "@/components/star-rating";
import { BookActions } from "@/components/book-actions";
import { BookCover } from "@/components/book-cover";
import { RetryButton } from "@/components/retry-button";

// Detail page for a book that lives in an external catalog (Google Books /
// OpenLibrary) but not yet in our database — i.e. anything reached from search
// results or the landing-page shelves. The id can contain slashes
// (OpenLibrary keys look like `ol:/works/OL123W`), so this is a catch-all route
// and we rejoin the captured segments before looking the book up.
export default async function ExternalBookPage({
  params,
}: {
  params: Promise<{ externalId: string[] }>;
}) {
  const { externalId } = await params;
  const id = externalId.map(decodeURIComponent).join("/");
  const book = await getBookByExternalId(id);

  // If the catalog lookup couldn't reach OL/Google (cold start, rate limit,
  // timeout), render a graceful retry page instead of a hard 404 — the book
  // very likely exists, we just couldn't load it this time.
  if (!book) return <BookUnavailable />;

  // The same book may already exist in our DB (if any reader has added it).
  // If so, surface its reader reviews below the catalog metadata.
  const dbBook = await db.book.findUnique({
    where: { externalId: id },
    include: {
      reviews: { where: { isPublic: true }, take: 10, orderBy: { createdAt: "desc" }, include: { user: true } },
    },
  });
  const reviews = dbBook?.reviews ?? [];

  return (
    <article className="grid gap-10 md:grid-cols-[200px_1fr]">
      <BookCover
        src={book.coverUrl}
        title={book.title}
        authors={book.authors}
        size="lg"
        className="shadow-glow"
      />

      <div className="space-y-4">
        <div>
          <h1 className="font-serif text-4xl text-ink-900">{book.title}</h1>
          {book.subtitle && <p className="mt-1 text-ink-900/60">{book.subtitle}</p>}
          {book.authors.length > 0 && (
            <p className="mt-2 text-ink-900/70">{book.authors.join(", ")}</p>
          )}
          {book.publishedYear && (
            <p className="mt-1 text-sm text-ink-900/50">{book.publishedYear}</p>
          )}
        </div>

        {book.averageRating ? (
          <StarRating value={book.averageRating} count={book.ratingsCount} />
        ) : (
          <p className="text-sm text-ink-900/50">No rating yet</p>
        )}

        {book.description ? (
          <div>
            <h2 className="font-serif text-lg text-ink-900">Summary</h2>
            <p className="mt-1 max-w-2xl whitespace-pre-line text-ink-900/80">
              {book.description}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-ink-200 bg-ink-100/30 p-4">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-accent/60" />
            <div>
              <p className="text-sm text-ink-900/80">No summary available yet.</p>
              <p className="mt-1 text-xs text-ink-900/50">
                The catalog hasn&apos;t published a description for this title. Add it to your
                shelf below — your own review can be its first summary.
              </p>
            </div>
          </div>
        )}

        {book.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {book.genres.map((g) => (
              <span
                key={g}
                className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-900/60"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <BookActions
          bookId={dbBook?.id}
          book={{
            externalId: id,
            isbn13: book.isbn13,
            title: book.title,
            subtitle: book.subtitle,
            authors: book.authors,
            description: book.description,
            coverUrl: book.coverUrl,
            pageCount: book.pageCount,
            publishedYear: book.publishedYear,
            genres: book.genres,
          }}
        />

        <section className="pt-4">
          <h2 className="mb-3 font-serif text-2xl text-ink-900">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-ink-900/60">No reviews yet. Be the first to review it above.</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="border-b border-ink-200 pb-4 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink-900">{r.user.username}</span>
                    <StarRating value={r.rating} />
                  </div>
                  <p className="mt-1 text-ink-900/80">{r.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}

function BookUnavailable() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-ink-200 bg-ink-100/50">
        <BookOpen className="h-6 w-6 text-accent/60" />
      </div>
      <h1 className="mt-6 font-serif text-2xl text-ink-900">We couldn&apos;t load that book.</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-ink-900/65">
        The catalog (OpenLibrary / Google Books) didn&apos;t respond in time. This is usually
        temporary — try again in a moment, or browse for it from the library.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 rounded-md border border-ink-200 bg-ink-100/40 px-4 py-2 text-sm text-ink-900 transition hover:border-accent/50 hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to browse
        </Link>
        <RetryButton />
      </div>
    </div>
  );
}
