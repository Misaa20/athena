import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { BookCard } from "@/components/book-card";
import { ReviewCard } from "@/components/review-card";
import { QuoteCard } from "@/components/quote-card";
import { FollowButton } from "@/components/follow-button";
import { GoalRing } from "@/components/goal-ring";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const year = new Date().getFullYear();

  const user = await db.user.findUnique({
    where: { username },
    include: {
      entries: { include: { book: true }, orderBy: { updatedAt: "desc" }, take: 24 },
      reviews: {
        include: { book: true, _count: { select: { likes: true, comments: true } } },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      quotes: {
        include: { book: { select: { id: true, title: true, authors: true, coverUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) notFound();

  const [goal, readThisYear] = await Promise.all([
    db.readingGoal.findUnique({ where: { userId_year: { userId: user.id, year } } }),
    db.readingEntry.count({
      where: {
        userId: user.id,
        status: "FINISHED",
        finishedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
      },
    }),
  ]);

  const finished = user.entries.filter((e) => e.status === "FINISHED");
  const reading = user.entries.filter((e) => e.status === "READING");

  return (
    <div className="space-y-14">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">@{user.username}</p>
          <h1 className="font-serif text-4xl text-ink-900">{user.displayName ?? user.username}</h1>
          {user.bio && <p className="max-w-2xl text-ink-900/70">{user.bio}</p>}
          <p className="text-sm text-ink-900/60">
            <Link href={`/u/${user.username}/followers`} className="hover:text-accent">
              <span className="font-medium text-ink-900">{user._count.followers}</span> followers
            </Link>{" "}
            ·{" "}
            <Link href={`/u/${user.username}/following`} className="hover:text-accent">
              <span className="font-medium text-ink-900">{user._count.following}</span> following
            </Link>
          </p>
        </div>
        <FollowButton username={user.username} />
      </header>

      {/* AI reading personality (public, if generated) */}
      {user.readerType && user.tasteProfile && (
        <section className="relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-ink-100/80 to-ink-100/30 p-6 shadow-glow backdrop-blur">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
          <div className="relative">
            <div className="mb-2 flex items-center gap-2 text-accent">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.2em]">Reading personality</span>
            </div>
            <h2 className="font-serif text-2xl text-ink-900">{user.readerType}</h2>
            <p className="mt-2 max-w-2xl text-ink-900/80">{user.tasteProfile}</p>
          </div>
        </section>
      )}

      <section className="grid items-center gap-4 md:grid-cols-3">
        <Card>
          <CardTitle>Currently reading</CardTitle>
          <CardDescription className="mt-1">{reading.length} books</CardDescription>
        </Card>
        <Card>
          <CardTitle>Finished</CardTitle>
          <CardDescription className="mt-1">{finished.length} books</CardDescription>
        </Card>
        {goal ? (
          <div className="flex items-center gap-4 rounded-xl border border-ink-200 bg-ink-100/60 p-6 backdrop-blur">
            <GoalRing read={readThisYear} target={goal.target} size={92} />
            <div>
              <p className="font-serif text-ink-900">{year} goal</p>
              <p className="text-sm text-ink-900/60">
                {readThisYear >= goal.target ? "Reached 🎉" : `${goal.target - readThisYear} to go`}
              </p>
            </div>
          </div>
        ) : (
          <Card>
            <CardTitle>Member since</CardTitle>
            <CardDescription className="mt-1">{user.createdAt.toLocaleDateString()}</CardDescription>
          </Card>
        )}
      </section>

      {user.entries.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-2xl text-ink-900">Shelves</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6">
            {user.entries.map((e) => (
              <BookCard
                key={e.id}
                id={e.bookId}
                title={e.book.title}
                authors={e.book.authors}
                coverUrl={e.book.coverUrl}
              />
            ))}
          </div>
        </section>
      )}

      {user.quotes.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-2xl text-ink-900">Quotes wall</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {user.quotes.map((q) => (
              <QuoteCard key={q.id} body={q.body} page={q.page} book={q.book} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 font-serif text-2xl text-ink-900">Reviews</h2>
        {user.reviews.length === 0 ? (
          <p className="text-ink-900/60">No reviews yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {user.reviews.map((r) => (
              <ReviewCard
                key={r.id}
                reviewId={r.id}
                book={{
                  id: r.book.id,
                  title: r.book.title,
                  authors: r.book.authors,
                  coverUrl: r.book.coverUrl,
                }}
                rating={r.rating}
                body={r.body}
                createdAt={r.createdAt.toISOString()}
                spoiler={r.spoiler}
                reviewer={{ username: user.username, displayName: user.displayName }}
                likes={r._count.likes}
                comments={r._count.comments}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
