"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/book-card";
import { ReviewCard } from "@/components/review-card";
import { FollowButton } from "@/components/follow-button";
import { GoalCard } from "@/components/goal-card";
import { PersonalityCard } from "@/components/personality-card";
import { authedFetch } from "@/lib/client";

type Status = "WANT_TO_READ" | "READING" | "FINISHED" | "DNF";

type Entry = {
  id: string;
  status: Status;
  rating: number | null;
  finishedAt: string | null;
  book: { id: string; title: string; authors: string[]; coverUrl: string | null };
};

type MyReview = {
  id: string;
  rating: number;
  body: string;
  spoiler: boolean;
  createdAt: string;
  book: { id: string; title: string; authors: string[]; coverUrl: string | null };
  likes: number;
  comments: number;
};

type FeedUser = { username: string; displayName: string | null };
type FeedBook = { id: string; title: string; authors: string[]; coverUrl: string | null };
type FeedItem =
  | {
      kind: "review";
      id: string;
      reviewId: string;
      at: string;
      user: FeedUser;
      book: FeedBook;
      rating: number;
      body: string;
      spoiler: boolean;
      likes: number;
      comments: number;
    }
  | {
      kind: "shelf";
      id: string;
      at: string;
      user: FeedUser;
      book: FeedBook;
      status: Status;
      rating: number | null;
    };

type Suggestion = {
  username: string;
  displayName: string | null;
  bio: string | null;
  followers: number;
  reviews: number;
};

const SHELF_VERB: Record<Status, string> = {
  WANT_TO_READ: "wants to read",
  READING: "is reading",
  FINISHED: "finished",
  DNF: "set aside",
};

export default function DashboardPage() {
  const { ready, authenticated, login } = usePrivy();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (!authenticated) return;
    authedFetch<{ entries: Entry[] }>("/api/library")
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]));
    authedFetch<{ reviews: MyReview[] }>("/api/reviews")
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]));
    authedFetch<{ items: FeedItem[]; suggestions: Suggestion[] }>("/api/feed")
      .then((d) => {
        setFeed(d.items ?? []);
        setSuggestions(d.suggestions ?? []);
      })
      .catch(() => setFeed([]));
  }, [authenticated]);

  const reading = entries?.filter((e) => e.status === "READING") ?? [];
  const finished = entries?.filter((e) => e.status === "FINISHED") ?? [];
  const want = entries?.filter((e) => e.status === "WANT_TO_READ") ?? [];
  const thisYear = finished.filter(
    (e) => e.finishedAt && new Date(e.finishedAt).getFullYear() === new Date().getFullYear(),
  ).length;

  if (ready && !authenticated) {
    return (
      <div className="space-y-10">
        <header>
          <h1 className="font-serif text-4xl text-ink-900">Welcome back</h1>
          <p className="mt-2 text-ink-900/60">Pick up where you left off.</p>
        </header>
        <div className="rounded-md border border-ink-200 bg-ink-100 p-4">
          <p className="text-sm text-ink-900/70">Sign in to see your reading dashboard.</p>
          <Button className="mt-3" onClick={() => login()}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl text-ink-900">Welcome back</h1>
          <p className="mt-2 text-ink-900/60">Pick up where you left off.</p>
        </div>
        <Link href="/library" className="text-sm text-accent hover:underline">
          See full library →
        </Link>
      </header>

      {/* --- Reading personality (the hook) ---------------------------------- */}
      <PersonalityCard />

      {/* --- Goal + your reading -------------------------------------------- */}
      <GoalCard />

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardTitle>Currently reading</CardTitle>
          <CardDescription className="mt-2">
            {reading.length === 0
              ? "Nothing yet. Mark a book as Reading from its page."
              : `${reading.length} book${reading.length > 1 ? "s" : ""} in progress.`}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>This year</CardTitle>
          <CardDescription className="mt-2">
            {thisYear} book{thisYear === 1 ? "" : "s"} finished.
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Up next</CardTitle>
          <CardDescription className="mt-2">
            {want.length === 0
              ? "Your “Want to Read” shelf is empty."
              : `${want.length} book${want.length > 1 ? "s" : ""} waiting.`}
          </CardDescription>
        </Card>
      </section>

      {reading.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-2xl text-ink-900">Reading now</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6">
            {reading.map((e) => (
              <BookCard
                key={e.id}
                id={e.book.id}
                title={e.book.title}
                authors={e.book.authors}
                coverUrl={e.book.coverUrl}
              />
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-serif text-2xl text-ink-900">Your recent reviews</h2>
            <Link href="/quotes" className="text-sm text-accent hover:underline">
              Your quotes wall →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.slice(0, 4).map((r) => (
              <ReviewCard
                key={r.id}
                reviewId={r.id}
                book={r.book}
                rating={r.rating}
                body={r.body}
                createdAt={r.createdAt}
                spoiler={r.spoiler}
                likes={r.likes}
                comments={r.comments}
              />
            ))}
          </div>
        </section>
      )}

      {/* --- From people you follow ------------------------------------------ */}
      <section className="border-t border-ink-200 pt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl text-ink-900">From people you follow</h2>
          <Link href="/people" className="text-sm text-accent hover:underline">
            Find readers →
          </Link>
        </div>

        {feed === null ? (
          <p className="text-ink-900/50">Loading activity…</p>
        ) : feed.length > 0 ? (
          <div className="space-y-3">
            {feed.map((item) =>
              item.kind === "review" ? (
                <ReviewCard
                  key={item.id}
                  reviewId={item.reviewId}
                  book={item.book}
                  rating={item.rating}
                  body={item.body}
                  createdAt={item.at}
                  reviewer={item.user}
                  spoiler={item.spoiler}
                  likes={item.likes}
                  comments={item.comments}
                />
              ) : (
                <ShelfActivity key={item.id} item={item} />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-ink-900/60">
              You’re not following anyone yet. Follow a few readers to fill this feed.
            </p>
            {suggestions.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium text-ink-900">Readers to follow</h3>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <li
                      key={s.username}
                      className="flex items-start justify-between gap-4 rounded-lg border border-ink-200 p-4"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/u/${s.username}`}
                          className="font-serif text-ink-900 hover:underline"
                        >
                          {s.displayName ?? s.username}
                        </Link>
                        <p className="text-sm text-accent">@{s.username}</p>
                        <p className="mt-1 text-xs text-ink-900/50">
                          {s.reviews} review{s.reviews === 1 ? "" : "s"} · {s.followers} follower
                          {s.followers === 1 ? "" : "s"}
                        </p>
                      </div>
                      <FollowButton username={s.username} className="shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- Librarian ------------------------------------------------------- */}
      <section className="border-t border-ink-200 pt-10">
        <h2 className="font-serif text-2xl text-ink-900">Ask the librarian</h2>
        <p className="mt-2 text-ink-900/60">
          “A slow, melancholic novel under 250 pages.” &nbsp;·&nbsp; “Something like Ishiguro but funnier.”
        </p>
        <Link
          href="/librarian"
          className="mt-4 inline-flex h-10 items-center rounded-md border border-ink-200 px-4 text-sm hover:bg-ink-100"
        >
          Open the librarian
        </Link>
      </section>
    </div>
  );
}

function ShelfActivity({
  item,
}: {
  item: Extract<FeedItem, { kind: "shelf" }>;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-200 px-4 py-3">
      <Link href={`/books/${item.book.id}`} className="shrink-0">
        <div className="aspect-[2/3] w-8 overflow-hidden rounded bg-ink-100">
          {item.book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.book.coverUrl}
              alt={item.book.title}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      </Link>
      <p className="text-sm text-ink-900/80">
        <Link href={`/u/${item.user.username}`} className="text-accent hover:underline">
          {item.user.displayName ?? `@${item.user.username}`}
        </Link>{" "}
        {SHELF_VERB[item.status]}{" "}
        <Link href={`/books/${item.book.id}`} className="font-medium text-ink-900 hover:underline">
          {item.book.title}
        </Link>
      </p>
    </div>
  );
}
