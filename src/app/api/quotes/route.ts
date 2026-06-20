import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BookPayload, resolveBookId } from "@/lib/book-store";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/quotes              — the current user's quotes (authed)
// GET /api/quotes?username=... — a reader's public quotes
export async function GET(req: Request) {
  const username = new URL(req.url).searchParams.get("username");

  let userId: string | null = null;
  if (username) {
    const u = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
    userId = u.id;
  } else {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;
  }

  const quotes = await db.quote.findMany({
    where: { userId, ...(username ? { isPublic: true } : {}) },
    include: { book: { select: { id: true, title: true, authors: true, coverUrl: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return NextResponse.json({
    quotes: quotes.map((q) => ({
      id: q.id,
      body: q.body,
      page: q.page,
      createdAt: q.createdAt.toISOString(),
      book: q.book,
    })),
  });
}

const Body = z
  .object({
    body: z.string().min(1).max(2000),
    page: z.number().int().positive().optional(),
    isPublic: z.boolean().default(true),
    bookId: z.string().optional(),
    book: BookPayload.optional(),
  })
  .refine((d) => d.bookId || d.book, { message: "bookId or book is required" });

// POST /api/quotes — save a quote from a book.
export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "quotes:write", limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const resolvedBookId = await resolveBookId({ bookId: parsed.data.bookId, book: parsed.data.book });
  if (!resolvedBookId) return NextResponse.json({ error: "book_not_found" }, { status: 404 });

  const quote = await db.quote.create({
    data: {
      userId: user.id,
      bookId: resolvedBookId,
      body: parsed.data.body.trim(),
      page: parsed.data.page ?? null,
      isPublic: parsed.data.isPublic,
    },
  });
  return NextResponse.json({ quote });
}

// DELETE /api/quotes?id=... — remove one of the user's quotes.
export async function DELETE(req: Request) {
  const limited = rateLimit(req, { name: "quotes:write", limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  await db.quote.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
