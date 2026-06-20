import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BookPayload, resolveBookId } from "@/lib/book-store";
import { rateLimit } from "@/lib/rate-limit";

const Body = z
  .object({
    value: z.boolean(),
    bookId: z.string().optional(),
    book: BookPayload.optional(),
  })
  .refine((d) => d.bookId || d.book, { message: "bookId or book is required" });

// POST /api/me/favorites { value, bookId | book } — toggle favorite for a book.
// Favoriting a book that isn't on a shelf yet creates a WANT_TO_READ entry so
// the favorite has somewhere to attach (favorites live on ReadingEntry).
export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "favorites:write", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const { value, bookId, book } = parsed.data;
  const resolvedBookId = await resolveBookId({ bookId, book });
  if (!resolvedBookId) return NextResponse.json({ error: "book_not_found" }, { status: 404 });

  const entry = await db.readingEntry.upsert({
    where: { userId_bookId: { userId: user.id, bookId: resolvedBookId } },
    update: { isFavorite: value },
    create: { userId: user.id, bookId: resolvedBookId, status: "WANT_TO_READ", isFavorite: value },
  });
  return NextResponse.json({ entry });
}
