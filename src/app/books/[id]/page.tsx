import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { db } from "@/lib/db";
import { StarRating } from "@/components/star-rating";
import { BookActions } from "@/components/book-actions";
import { BookCover } from "@/components/book-cover";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await db.book.findUnique({
    where: { id },
    include: {
      reviews: { take: 10, orderBy: { createdAt: "desc" }, include: { user: true } },
      quotes: { take: 10, orderBy: { createdAt: "desc" }, include: { user: true } },
    },
  });

  if (!book) notFound();

  // Average rating across all reviews for this book (not just the 10 shown).
  const agg = await db.review.aggregate({
    where: { bookId: id },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const averageRating = agg._avg.rating ?? undefined;
  const ratingsCount = agg._count.rating;

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
        </div>

        {averageRating ? (
          <StarRating value={averageRating} count={ratingsCount} />
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
                The catalog hasn&apos;t published a description for this title. Your review can be
                its first summary.
              </p>
            </div>
          </div>
        )}

        <BookActions
          bookId={book.id}
          book={{
            externalId: book.externalId ?? undefined,
            isbn13: book.isbn13 ?? undefined,
            title: book.title,
            subtitle: book.subtitle ?? undefined,
            authors: book.authors,
            description: book.description ?? undefined,
            coverUrl: book.coverUrl ?? undefined,
            pageCount: book.pageCount ?? undefined,
            publishedYear: book.publishedYear ?? undefined,
            genres: book.genres,
          }}
        />

        <section className="pt-4">
          <h2 className="mb-3 font-serif text-2xl text-ink-900">Reviews</h2>
          {book.reviews.length === 0 ? (
            <p className="text-ink-900/60">No reviews yet.</p>
          ) : (
            <ul className="space-y-4">
              {book.reviews.map((r) => (
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

        {book.quotes.length > 0 && (
          <section className="pt-2">
            <h2 className="mb-3 font-serif text-2xl text-ink-900">Quotes</h2>
            <ul className="space-y-3 text-ink-900/80">
              {book.quotes.map((q) => (
                <li key={q.id}>
                  “{q.body}” — {q.user.username}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
