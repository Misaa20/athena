import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BookPayload, resolveBookId } from "@/lib/book-store";
import { rateLimit } from "@/lib/rate-limit";

const STATUSES = ["WANT_TO_READ", "READING", "FINISHED", "DNF"] as const;

const Body = z
  .object({
    status: z.enum(STATUSES).default("WANT_TO_READ"),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    bookId: z.string().optional(),
    book: BookPayload.optional(),
  })
  .refine((d) => d.bookId || d.book, { message: "bookId or book is required" });

// GET /api/library?status=... — the current user's shelves.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const valid = STATUSES.find((s) => s === status);

  const entries = await db.readingEntry.findMany({
    where: { userId: user.id, ...(valid ? { status: valid } : {}) },
    include: { book: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ entries });
}

// POST /api/library — add/update a shelf entry for the current user. Accepts a
// known bookId or a catalog payload (upserted on the fly).
export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "library:write", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const { status, rating, bookId, book } = parsed.data;

  const resolvedBookId = await resolveBookId({ bookId, book });
  if (!resolvedBookId) return NextResponse.json({ error: "book_not_found" }, { status: 404 });

  const entry = await db.readingEntry.upsert({
    where: { userId_bookId: { userId: user.id, bookId: resolvedBookId } },
    update: {
      status,
      ...(rating !== undefined ? { rating } : {}),
      ...(status === "READING" ? { startedAt: new Date() } : {}),
      ...(status === "FINISHED" ? { finishedAt: new Date() } : {}),
    },
    create: {
      userId: user.id,
      bookId: resolvedBookId,
      status,
      rating: rating ?? null,
      // Stamp timestamps on create too — otherwise shelving a book straight to
      // FINISHED leaves finishedAt null and it never counts toward the reading
      // goal (booksReadInYear filters on finishedAt).
      ...(status === "READING" ? { startedAt: new Date() } : {}),
      ...(status === "FINISHED" ? { finishedAt: new Date() } : {}),
    },
  });
  return NextResponse.json({ entry });
}

// DELETE /api/library?bookId=... — remove a book from the current user's shelves.
export async function DELETE(req: Request) {
  const limited = rateLimit(req, { name: "library:write", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bookId = new URL(req.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "missing_book" }, { status: 400 });

  await db.readingEntry.deleteMany({ where: { userId: user.id, bookId } });
  return NextResponse.json({ ok: true });
}
