import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/people?q=... — directory of readers, optionally filtered by a search
// over username/display name. Ordered by follower count so active readers
// surface first. Works unauthenticated; when authed, each row carries whether
// the current user already follows them (and whether the row is the user).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const user = await getCurrentUser(req);

  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    include: {
      _count: { select: { followers: true, entries: true, reviews: true } },
    },
    orderBy: [{ followers: { _count: "desc" } }, { createdAt: "desc" }],
    take: 50,
  });

  let followingSet = new Set<string>();
  if (user) {
    const follows = await db.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });
    followingSet = new Set(follows.map((f) => f.followingId));
  }

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      bio: u.bio,
      followers: u._count.followers,
      books: u._count.entries,
      reviews: u._count.reviews,
      isFollowing: followingSet.has(u.id),
      isSelf: user?.id === u.id,
    })),
  });
}
