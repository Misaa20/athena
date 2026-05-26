import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookCard } from "@/components/book-card";
import { LoadMoreBooks } from "@/components/load-more-books";
import { CATEGORIES, categoryDescription, categoryLabel, getSubjectPage } from "@/lib/books";

export const revalidate = 3600;

const PAGE_SIZE = 24;

// Pre-render the known genres; arbitrary subjects still work on demand.
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ subject: c.subject }));
}

export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  return { title: `${categoryLabel(subject)} books · Athena` };
}

export default async function GenrePage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  const label = categoryLabel(subject);
  const description = categoryDescription(subject);
  const { books, total, ok } = await getSubjectPage(subject, PAGE_SIZE, 0);

  // Only 404 when OpenLibrary answered and the subject genuinely has no works —
  // a failed lookup (ok:false) is a transient hiccup, not a missing genre.
  if (ok && total === 0) notFound();

  const hasMore = PAGE_SIZE < total;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-sm text-ink-900/60 transition hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          All of Browse
        </Link>
        <div>
          <h1 className="font-serif text-4xl text-ink-900">{label}</h1>
          <p className="mt-2 max-w-2xl text-ink-900/70">{description}</p>
          {total > 0 && (
            <p className="mt-1 text-sm text-ink-900/50">
              {total.toLocaleString()} titles to explore.
            </p>
          )}
        </div>

        {/* Quick jump to other genres */}
        <nav className="flex flex-wrap gap-2 text-sm">
          {CATEGORIES.map((c) => (
            <Link
              key={c.subject}
              href={`/browse/${c.subject}`}
              className={
                c.subject === subject
                  ? "rounded-md border border-accent/50 bg-accent/10 px-3 py-1.5 text-accent"
                  : "rounded-md border border-ink-200 px-3 py-1.5 text-ink-900/70 hover:bg-ink-100"
              }
            >
              {c.label}
            </Link>
          ))}
        </nav>
      </header>

      {books.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
      ) : (
        <p className="rounded-lg border border-ink-200 bg-ink-100 p-6 text-ink-900/60">
          Couldn’t reach the catalog just now. Refresh in a moment to load {label.toLowerCase()} titles.
        </p>
      )}

      <LoadMoreBooks subject={subject} initialOffset={PAGE_SIZE} initialHasMore={hasMore} />
    </div>
  );
}
