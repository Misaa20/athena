import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const Body = z.object({ usernames: z.array(z.string()).max(200) });

// POST /api/follow/status { usernames: [...] } — batched follow lookup.
// Returns { statuses: { [username]: { following, self } } } for every username
// that resolves to a real user. Used by FollowButton's client-side coalescer so
// a page full of buttons makes one request instead of one per button. Works
// unauthenticated (everything comes back following:false).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const usernames = [...new Set(parsed.data.usernames)];
  if (usernames.length === 0) return NextResponse.json({ statuses: {} });

  const targets = await db.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  });

  const user = await getCurrentUser(req);

  let followingSet = new Set<string>();
  if (user && targets.length > 0) {
    const follows = await db.follow.findMany({
      where: { followerId: user.id, followingId: { in: targets.map((t) => t.id) } },
      select: { followingId: true },
    });
    followingSet = new Set(follows.map((f) => f.followingId));
  }

  const statuses: Record<string, { following: boolean; self: boolean }> = {};
  for (const t of targets) {
    statuses[t.username] = {
      following: followingSet.has(t.id),
      self: user?.id === t.id,
    };
  }

  return NextResponse.json({ statuses });
}
