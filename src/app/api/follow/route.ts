import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const Body = z
  .object({ username: z.string().optional(), userId: z.string().optional() })
  .refine((d) => d.username || d.userId, { message: "username or userId is required" });

// Resolve the target user from a username or id.
async function resolveTarget(input: { username?: string; userId?: string }) {
  if (input.userId) return db.user.findUnique({ where: { id: input.userId }, select: { id: true } });
  if (input.username) return db.user.findUnique({ where: { username: input.username }, select: { id: true } });
  return null;
}

// GET /api/follow?username=... — does the current user follow this person?
// Works unauthenticated (returns following:false) so the button can render
// before login. `self` lets the UI hide the button on your own profile.
export async function GET(req: Request) {
  const username = new URL(req.url).searchParams.get("username");
  if (!username) return NextResponse.json({ error: "missing_username" }, { status: 400 });

  const target = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ following: false, self: false });
  if (user.id === target.id) return NextResponse.json({ following: false, self: true });

  const follow = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
  });
  return NextResponse.json({ following: !!follow, self: false });
}

// POST /api/follow { username | userId } — follow that user (idempotent).
export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "follow:write", limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const target = await resolveTarget(parsed.data);
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: "cannot_follow_self" }, { status: 400 });

  await db.follow.upsert({
    where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
    create: { followerId: user.id, followingId: target.id },
    update: {},
  });
  return NextResponse.json({ following: true });
}

// DELETE /api/follow?username=... | ?userId=... — unfollow.
export async function DELETE(req: Request) {
  const limited = rateLimit(req, { name: "follow:write", limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const target = await resolveTarget({
    username: searchParams.get("username") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
  });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.follow.deleteMany({ where: { followerId: user.id, followingId: target.id } });
  return NextResponse.json({ following: false });
}
