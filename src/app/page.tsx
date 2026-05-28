import Link from "next/link";
import { BookHeart, Sparkles, BookMarked, Users, Quote, Compass, Library, ArrowRight } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Shelf } from "@/components/shelf";
import { CATEGORIES, getBooksBySubject, getNewReleases, getTrendingBooks } from "@/lib/books";

// Re-fetch the shelves at most once an hour.
export const revalidate = 3600;

const features = [
  {
    icon: Library,
    title: "A library that remembers",
    body: "Track every book you read, every note you take, every line you loved — and find them again years later.",
  },
  {
    icon: Sparkles,
    title: "An AI librarian",
    body: "Ask in plain English: \"a quiet, philosophical novel under 300 pages.\" Get recommendations tailored to what you actually read.",
  },
  {
    icon: BookHeart,
    title: "Your reading personality",
    body: "Athena reads your shelves and tells you what kind of reader you are — your themes, your tastes, your blind spots.",
  },
  {
    icon: Users,
    title: "A profile worth sharing",
    body: "Follow other readers, trade reviews, build a quotes wall. Your reading life, beautifully presented.",
  },
];

const stats = [
  { value: "10M+", label: "Books indexed" },
  { value: "AI", label: "Personalized picks" },
  { value: "∞", label: "Quotes saved" },
  { value: "16", label: "Genre shelves" },
];

const steps = [
  {
    n: "01",
    title: "Build your library",
    body: "Search 10M+ books. Mark what you've read, what you're reading, and what's waiting on the shelf.",
  },
  {
    n: "02",
    title: "Capture what stuck",
    body: "Rate, review, and save the quotes that gave you chills. Athena keeps them safe and searchable.",
  },
  {
    n: "03",
    title: "Discover your next read",
    body: "Ask the AI librarian in natural language. Get recommendations grounded in your actual taste — not a popularity contest.",
  },
];

export default async function HomePage() {
  const [trending, newReleases, ...categoryBooks] = await Promise.all([
    getTrendingBooks(14),
    getNewReleases(14),
    ...CATEGORIES.map((c) => getBooksBySubject(c.subject, 12)),
  ]);

  const collage = trending.filter((b) => b.coverUrl).slice(0, 5);
  const featured = trending.find((b) => b.coverUrl);

  return (
    <div className="space-y-28">
      {/* Hero ------------------------------------------------------------- */}
      <section className="relative grid items-center gap-10 pt-6 md:grid-cols-[1.1fr_0.9fr]">
        {/* Aurora wash behind hero */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="aurora absolute -left-32 -top-20 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
          <div className="aurora absolute right-0 top-40 h-[22rem] w-[22rem] rounded-full bg-wine/20 blur-3xl" />
        </div>

        <div className="animate-fade-up space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent">
            <Sparkles className="h-3 w-3" />
            An AI reading companion
          </span>
          <h1 className="font-serif text-5xl leading-[1.05] text-ink-900 md:text-6xl lg:text-7xl">
            Read deeply.
            <br />
            Remember{" "}
            <span className="text-gradient-gold">everything.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink-900/70">
            Athena is what Goodreads should have been — a quiet, candlelit place for readers, with an
            AI librarian who actually pays attention to what you love.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 font-medium text-ink-50 shadow-glow transition hover:-translate-y-0.5 hover:bg-accent-dark hover:shadow-glow-lg"
            >
              Start your library
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/librarian"
              className="group inline-flex h-12 items-center gap-2 rounded-md border border-ink-200 bg-ink-100/30 px-6 text-ink-900 backdrop-blur-sm transition hover:border-accent/50 hover:bg-ink-100"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              Try the librarian
            </Link>
          </div>
          <div className="flex items-center gap-2 pt-3 text-xs text-ink-900/40">
            <span className="flex -space-x-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-5 w-5 rounded-full border border-ink-50 bg-gradient-to-br from-accent/60 to-wine/40"
                />
              ))}
            </span>
            <span>Joined by readers who keep their bookshelves close.</span>
          </div>
        </div>

        {/* Floating cover collage */}
        {collage.length >= 3 && (
          <div className="relative mx-auto hidden h-96 w-full max-w-md md:block">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl candle-flicker" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10 spin-slow" />
            {collage.map((b, i) => {
              const spread = [
                "left-0 top-16 -rotate-12 float-slow",
                "left-20 top-6 -rotate-6 float",
                "left-40 top-2 rotate-0 z-10 float-slow",
                "left-60 top-6 rotate-6 float",
                "left-80 top-16 rotate-12 float-slow",
              ];
              return (
                <div
                  key={b.externalId}
                  className={`absolute aspect-[2/3] w-28 overflow-hidden rounded-md shadow-glow ring-1 ring-ink-200/50 transition duration-500 hover:z-20 hover:-translate-y-3 hover:rotate-0 hover:shadow-glow-lg ${spread[i] ?? ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.coverUrl!}
                    alt={b.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Stats strip ------------------------------------------------------ */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="glass rounded-xl px-5 py-6 text-center animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <p className="font-serif text-3xl text-gradient-gold">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-ink-900/55">{s.label}</p>
          </div>
        ))}
      </section>

      <hr className="rule-gold" />

      {/* Featured book — book of the day -------------------------------- */}
      {featured && (
        <section className="relative overflow-hidden rounded-2xl border border-ink-200 bg-ink-100/40 p-8 md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
            <Link
              href={`/books/external/${featured.externalId}`}
              className="relative block aspect-[2/3] w-32 overflow-hidden rounded-md shadow-glow ring-1 ring-ink-200/50 transition hover:-translate-y-1 hover:shadow-glow-lg md:w-40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured.coverUrl!}
                alt={featured.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </Link>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-wine/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-wine">
                <BookMarked className="h-3 w-3" /> Reader pick
              </span>
              <h3 className="mt-3 font-serif text-2xl text-ink-900 md:text-3xl">{featured.title}</h3>
              {featured.authors?.length ? (
                <p className="mt-1 text-sm text-ink-900/60">by {featured.authors.join(", ")}</p>
              ) : null}
              {featured.description && (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-900/70 line-clamp-3">
                  {featured.description}
                </p>
              )}
              <Link
                href={`/books/external/${featured.externalId}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-light"
              >
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <Shelf title="Trending now" subtitle="What readers are picking up today." books={trending} />
      <Shelf title="New releases" subtitle="Fresh off the press and already being read." books={newReleases} />

      <section className="space-y-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-3xl text-ink-900">Browse by category</h2>
            <p className="mt-1 text-ink-900/60">Pick a mood. Find your next read.</p>
          </div>
          <Link
            href="/browse"
            className="hidden items-center gap-1.5 text-sm text-accent hover:text-accent-light md:inline-flex"
          >
            All genres <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {CATEGORIES.map((c, i) => (
          <Shelf key={c.subject} title={c.label} books={categoryBooks[i]} />
        ))}
      </section>

      {/* How it works ---------------------------------------------------- */}
      <section className="space-y-10">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-accent">How it works</p>
          <h2 className="mt-2 font-serif text-3xl text-ink-900 md:text-4xl">
            Three steps to a smarter shelf.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="group relative overflow-hidden rounded-xl border border-ink-200 bg-ink-100/40 p-6 transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-glow animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="font-serif text-5xl text-accent/25 transition group-hover:text-accent/50">
                {s.n}
              </span>
              <h3 className="mt-3 font-serif text-lg text-ink-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-900/65">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature cards --------------------------------------------------- */}
      <section className="grid gap-6 md:grid-cols-2">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <Card
              key={f.title}
              variant="glass"
              className="animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/30 to-wine/20 ring-1 ring-accent/30 transition group-hover:ring-accent/60">
                  <Icon className="h-5 w-5 text-accent" />
                </span>
                <div>
                  <CardTitle>{f.title}</CardTitle>
                  <CardDescription className="mt-2 text-base text-ink-900/70">
                    {f.body}
                  </CardDescription>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      {/* CTA ------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-2xl border border-ink-200 bg-gradient-to-br from-ink-100/80 via-ink-100/40 to-ink-50 p-10 text-center md:p-16">
        <div className="pointer-events-none absolute inset-0 bg-mesh-warm opacity-40" />
        <div className="relative">
          <Quote className="mx-auto h-8 w-8 text-accent/60" />
          <p className="mx-auto mt-4 max-w-2xl font-serif text-2xl leading-snug text-ink-900 md:text-3xl">
            &ldquo;A reader lives a thousand lives before he dies. The one who never reads lives only one.&rdquo;
          </p>
          <p className="mt-3 text-sm text-ink-900/50">— George R.R. Martin</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 font-medium text-ink-50 shadow-glow transition hover:-translate-y-0.5 hover:bg-accent-dark"
            >
              Start your library <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/browse"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-ink-200 px-6 text-ink-900 transition hover:border-accent/50 hover:bg-ink-100"
            >
              <Compass className="h-4 w-4 text-accent" />
              Just browsing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
