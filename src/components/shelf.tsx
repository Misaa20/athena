import Link from "next/link";
import { BookCard } from "@/components/book-card";
import type { BookSearchResult } from "@/lib/books";

type Props = {
  title: string;
  subtitle?: string;
  books: BookSearchResult[];
  /** When set, renders a "View all →" link to a fuller listing of this shelf. */
  href?: string;
};

// A horizontally scrolling row of book covers. Renders nothing when there are
// no books, so callers can drop it in without guarding empty data sources.
export function Shelf({ title, subtitle, books, href }: Props) {
  if (books.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-serif text-2xl text-ink-900">{title}</h3>
          {subtitle && <p className="text-sm text-ink-900/60">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="shrink-0 whitespace-nowrap text-sm text-accent transition hover:text-ink-900"
          >
            View all →
          </Link>
        )}
      </div>
      <div className="-mx-1 flex snap-x gap-5 overflow-x-auto px-1 pb-4">
        {books.map((b) => (
          <BookCard
            key={b.externalId}
            externalId={b.externalId}
            title={b.title}
            authors={b.authors}
            coverUrl={b.coverUrl}
            className="w-32 shrink-0 snap-start sm:w-36"
          />
        ))}
      </div>
    </section>
  );
}
