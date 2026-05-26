import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Shapes returned to the dashboard activity feed.
type PublicUser = { username: string; displayName: string | null };
type FeedBook = { id: string; title: string; authors: string[]; coverUrl: string | null };

// GET /api/feed — recent activity (reviews + shelf changes) from the people the
// current user follows, newest first. When the user follows nobody, returns an
// empty feed plus a few suggested readers so the dashboard can prompt discovery.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const follows = await db.follow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
  });
  const ids = follows.map((f) => f.followingId);

  if (ids.length === 0) {
    const suggestions = await db.user.findMany({
      where: { id: { not: user.id } },
      include: { _count: { select: { followers: true, reviews: true } } },
      orderBy: [{ followers: { _count: "desc" } }, { createdAt: "desc" }],
      take: 6,
    });
    return NextResponse.json({
      items: [],
      suggestions: suggestions.map((u) => ({
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        followers: u._count.followers,
        reviews: u._count.reviews,
      })),
    });
  }

  const [reviews, entries] = await Promise.all([
    db.review.findMany({
      where: { userId: { in: ids } },
      include: { user: true, book: true, _count: { select: { likes: true, comments: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.readingEntry.findMany({
      where: { userId: { in: ids } },
      include: { user: true, book: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const toUser = (u: { username: string; displayName: string | null }): PublicUser => ({
    username: u.username,
    displayName: u.displayName,
  });
  const toBook = (b: {
    id: string;
    title: string;
    authors: string[];
    coverUrl: string | null;
  }): FeedBook => ({ id: b.id, title: b.title, authors: b.authors, coverUrl: b.coverUrl });

  const reviewItems = reviews.map((r) => ({
    kind: "review" as const,
    id: `review-${r.id}`,
    reviewId: r.id,
    at: r.createdAt.toISOString(),
    user: toUser(r.user),
    book: toBook(r.book),
    rating: r.rating,
    body: r.body,
    spoiler: r.spoiler,
    likes: r._count.likes,
    comments: r._count.comments,
  }));

  const shelfItems = entries.map((e) => ({
    kind: "shelf" as const,
    id: `shelf-${e.id}`,
    at: e.updatedAt.toISOString(),
    user: toUser(e.user),
    book: toBook(e.book),
    status: e.status,
    rating: e.rating,
  }));

  const items = [...reviewItems, ...shelfItems]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 30);

  return NextResponse.json({ items, suggestions: [] });
}
