import Link from "next/link";
import { Shelf } from "@/components/shelf";
import {
  CATEGORIES,
  FEATURED_CATEGORIES,
  getBooksBySubject,
  getNewReleases,
  getTrendingBooks,
} from "@/lib/books";

// Discovery hub. Cached for an hour — the shelves come from external catalogs
// that return [] on failure, so the page always renders something.
export const revalidate = 3600;

export default async function BrowsePage() {
  const [trending, newReleases, ...categoryBooks] = await Promise.all([
    getTrendingBooks(16),
    getNewReleases(16),
    ...FEATURED_CATEGORIES.map((c) => getBooksBySubject(c.subject, 16)),
  ]);

  return (
    <div className="space-y-16">
      <header className="space-y-4">
        <h1 className="font-serif text-4xl text-ink-900">Browse</h1>
        <p className="text-ink-900/60">Trending titles, fresh releases, and every shelf worth a wander.</p>
        <nav className="flex flex-wrap gap-2 text-sm">
          <a href="#trending" className="rounded-md border border-ink-200 px-3 py-1.5 text-ink-900/70 hover:bg-ink-100">Trending</a>
          <a href="#new-releases" className="rounded-md border border-ink-200 px-3 py-1.5 text-ink-900/70 hover:bg-ink-100">New releases</a>
          {CATEGORIES.map((c) => (
            <Link
              key={c.subject}
              href={`/browse/${c.subject}`}
              className="rounded-md border border-ink-200 px-3 py-1.5 text-ink-900/70 hover:bg-ink-100"
            >
              {c.label}
            </Link>
          ))}
        </nav>
      </header>

      <div id="trending" className="scroll-mt-24">
        <Shelf title="Trending now" subtitle="What readers are picking up today." books={trending} />
      </div>

      <div id="new-releases" className="scroll-mt-24">
        <Shelf title="New releases" subtitle="Fresh off the press and already being read." books={newReleases} />
      </div>

      <section className="space-y-16">
        <div>
          <h2 className="font-serif text-3xl text-ink-900">By genre</h2>
          <p className="mt-1 text-ink-900/60">Pick a mood — then “View all” to dive into the full shelf.</p>
        </div>
        {FEATURED_CATEGORIES.map((c, i) => (
          <Shelf
            key={c.subject}
            title={c.label}
            subtitle={c.description}
            books={categoryBooks[i]}
            href={`/browse/${c.subject}`}
          />
        ))}
      </section>

      <section className="rounded-lg border border-ink-200 bg-ink-100 p-6">
        <h2 className="font-serif text-2xl text-ink-900">Looking for something specific?</h2>
        <p className="mt-1 text-ink-900/60">
          Search any title or author, or ask the librarian for something by vibe.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/library" className="inline-flex h-10 items-center rounded-md bg-ink-900 px-4 text-sm text-ink-50 hover:bg-ink-950">
            Search books
          </Link>
          <Link href="/librarian" className="inline-flex h-10 items-center rounded-md border border-ink-200 px-4 text-sm hover:bg-ink-50">
            Ask the librarian
          </Link>
        </div>
      </section>
    </div>
  );
}
