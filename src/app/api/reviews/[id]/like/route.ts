import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/reviews/[id]/like — like count + whether the current user liked it.
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const count = await db.reviewLike.count({ where: { reviewId: id } });

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ count, liked: false });

  const liked = await db.reviewLike.findUnique({
    where: { userId_reviewId: { userId: user.id, reviewId: id } },
  });
  return NextResponse.json({ count, liked: !!liked });
}

// POST /api/reviews/[id]/like — like (idempotent).
export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const review = await db.review.findUnique({ where: { id }, select: { id: true } });
  if (!review) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.reviewLike.upsert({
    where: { userId_reviewId: { userId: user.id, reviewId: id } },
    create: { userId: user.id, reviewId: id },
    update: {},
  });
  const count = await db.reviewLike.count({ where: { reviewId: id } });
  return NextResponse.json({ count, liked: true });
}

// DELETE /api/reviews/[id]/like — unlike.
export async function DELETE(req: Request, { params }: Ctx) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  await db.reviewLike.deleteMany({ where: { userId: user.id, reviewId: id } });
  const count = await db.reviewLike.count({ where: { reviewId: id } });
  return NextResponse.json({ count, liked: false });
}
