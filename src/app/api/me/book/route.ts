import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/me/book?bookId=... | ?externalId=...
// Returns the current user's shelf entry + their own review for one book, so the
// book page can render "you've shelved this / you've reviewed this" state.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  const externalId = searchParams.get("externalId");

  const book = bookId
    ? await db.book.findUnique({ where: { id: bookId }, select: { id: true } })
    : externalId
      ? await db.book.findUnique({ where: { externalId }, select: { id: true } })
      : null;

  // Book not in our DB yet → user definitely has no entry/review for it.
  if (!book) return NextResponse.json({ bookId: null, entry: null, review: null });

  const [entry, review] = await Promise.all([
    db.readingEntry.findUnique({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
    }),
    db.review.findUnique({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
    }),
  ]);

  return NextResponse.json({ bookId: book.id, entry, review });
}
