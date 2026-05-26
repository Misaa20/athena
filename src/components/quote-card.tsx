import Link from "next/link";

type QuoteBook = { id: string; title: string; authors: string[]; coverUrl?: string | null };

// A pull-quote card: a big serif blockquote over a warm panel, attributed to
// the book. The visual centerpiece of a reader's quotes wall.
export function QuoteCard({
  body,
  page,
  book,
}: {
  body: string;
  page?: number | null;
  book: QuoteBook;
}) {
  return (
    <figure className="relative overflow-hidden rounded-xl border border-ink-200 bg-ink-100/50 p-6 backdrop-blur transition hover:border-accent/40">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-1 -top-5 select-none font-serif text-7xl text-accent/20"
      >
        &ldquo;
      </span>
      <blockquote className="relative font-serif text-lg leading-relaxed text-ink-900/90">
        {body}
      </blockquote>
      <figcaption className="mt-4 text-sm text-ink-900/60">
        <Link href={`/books/${book.id}`} className="text-accent hover:underline">
          {book.title}
        </Link>
        {book.authors.length > 0 && <span> · {book.authors.join(", ")}</span>}
        {page ? <span className="text-ink-900/40"> · p.{page}</span> : null}
      </figcaption>
    </figure>
  );
}
