import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/reviews/[id]/comments — the thread, oldest first. Public.
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const comments = await db.reviewComment.findMany({
    where: { reviewId: id },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      user: { username: c.user.username, displayName: c.user.displayName },
    })),
  });
}

const Body = z.object({ body: z.string().min(1).max(2000) });

// POST /api/reviews/[id]/comments — add a comment.
export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const review = await db.review.findUnique({ where: { id }, select: { id: true } });
  if (!review) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const comment = await db.reviewComment.create({
    data: { reviewId: id, userId: user.id, body: parsed.data.body.trim() },
    include: { user: { select: { username: true, displayName: true } } },
  });
  return NextResponse.json({
    comment: {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      user: { username: comment.user.username, displayName: comment.user.displayName },
    },
  });
}
