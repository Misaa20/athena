import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BookPayload, resolveBookId } from "@/lib/book-store";
import { rateLimit } from "@/lib/rate-limit";

const Body = z
  .object({
    rating: z.number().int().min(1).max(5),
    body: z.string().min(1),
    spoiler: z.boolean().optional(),
    isPublic: z.boolean().default(true),
    bookId: z.string().optional(),
    book: BookPayload.optional(),
  })
  .refine((d) => d.bookId || d.book, { message: "bookId or book is required" });

// GET /api/reviews — the current user's own reviews, newest first (dashboard).
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const reviews = await db.review.findMany({
    where: { userId: user.id },
    include: { book: true, _count: { select: { likes: true, comments: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      spoiler: r.spoiler,
      createdAt: r.createdAt.toISOString(),
      book: r.book,
      likes: r._count.likes,
      comments: r._count.comments,
    })),
  });
}

// POST /api/reviews — create/update the current user's review for a book.
export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "reviews:write", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const { rating, body, spoiler, isPublic, bookId, book } = parsed.data;

  const resolvedBookId = await resolveBookId({ bookId, book });
  if (!resolvedBookId) return NextResponse.json({ error: "book_not_found" }, { status: 404 });

  const review = await db.review.upsert({
    where: { userId_bookId: { userId: user.id, bookId: resolvedBookId } },
    update: { rating, body, spoiler: spoiler ?? false, isPublic },
    create: { userId: user.id, bookId: resolvedBookId, rating, body, spoiler: spoiler ?? false, isPublic },
  });
  return NextResponse.json({ review });
}
