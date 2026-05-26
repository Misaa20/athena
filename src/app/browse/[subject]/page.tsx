import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { BookCard } from "@/components/book-card";
import { LoadMoreBooks } from "@/components/load-more-books";
import {
  CATEGORIES,
  categoryDescription,
  categoryLabel,
  getSubjectPage,
  parentCategory,
} from "@/lib/books";

export const revalidate = 3600;

const PAGE_SIZE = 24;

// Pre-render the known genres AND their sub-genres; arbitrary subjects still
// work on demand.
export function generateStaticParams() {
  const params: { subject: string }[] = [];
  for (const c of CATEGORIES) {
    params.push({ subject: c.subject });
    for (const s of c.subGenres ?? []) params.push({ subject: s.subject });
  }
  return params;
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
  // If this slug is a sub-genre, pull its parent so we can render a breadcrumb
  // back to the parent + sibling sub-genre chips.
  const parent = parentCategory(subject);
  // Sub-genres of the *current* category (when viewing a parent).
  const parentCat = CATEGORIES.find((c) => c.subject === subject);
  const subGenres = parent?.subGenres ?? parentCat?.subGenres ?? [];

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-900/60">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 transition hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            All of Browse
          </Link>
          {parent && (
            <>
              <span className="text-ink-900/30">·</span>
              <Link
                href={`/browse/${parent.subject}`}
                className="transition hover:text-accent"
              >
                {parent.label}
              </Link>
              <span className="text-ink-900/30">·</span>
              <span className="text-ink-900/80">{label}</span>
            </>
          )}
        </div>

        <div>
          <h1 className="font-serif text-4xl text-ink-900">{label}</h1>
          <p className="mt-2 max-w-2xl text-ink-900/70">{description}</p>
          {total > 0 && (
            <p className="mt-1 text-sm text-ink-900/50">
              {total.toLocaleString()} titles to explore.
            </p>
          )}
        </div>

        {/* Sub-genre chips. Shows children when on a parent, siblings when on
            a sub-genre. Hidden when neither has any. */}
        {subGenres.length > 0 && (
          <div className="rounded-xl border border-ink-200/60 bg-ink-100/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-accent" />
              <p className="text-xs uppercase tracking-[0.2em] text-ink-900/55">
                {parent ? `More in ${parent.label}` : "Browse by sub-genre"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {/* "All <parent>" pill so users can navigate back to the broad shelf. */}
              {parent && (
                <Link
                  href={`/browse/${parent.subject}`}
                  className="rounded-full border border-ink-200 px-3 py-1 text-ink-900/65 transition hover:border-accent/50 hover:text-accent"
                >
                  All {parent.label.toLowerCase()}
                </Link>
              )}
              {subGenres.map((s) => {
                const active = s.subject === subject;
                return (
                  <Link
                    key={s.subject}
                    href={`/browse/${s.subject}`}
                    className={
                      active
                        ? "rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-accent"
                        : "rounded-full border border-ink-200 px-3 py-1 text-ink-900/70 transition hover:border-accent/50 hover:text-accent"
                    }
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick jump to other top-level genres */}
        <nav className="flex flex-wrap gap-2 text-sm">
          {CATEGORIES.map((c) => {
            const isCurrent = c.subject === subject;
            const isParentOfCurrent = parent?.subject === c.subject;
            return (
              <Link
                key={c.subject}
                href={`/browse/${c.subject}`}
                className={
                  isCurrent || isParentOfCurrent
                    ? "rounded-md border border-accent/50 bg-accent/10 px-3 py-1.5 text-accent"
                    : "rounded-md border border-ink-200 px-3 py-1.5 text-ink-900/70 hover:bg-ink-100"
                }
              >
                {c.label}
              </Link>
            );
          })}
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
