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

  // Book not in our DB yet → user definitely has no entry/review for it. Still
  // ship the user's custom shelves so the picker can render even on a fresh book.
  if (!book) {
    const shelves = await db.shelf.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, isPublic: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ bookId: null, entry: null, review: null, shelves, onShelves: [] });
  }

  const [entry, review, shelves, onShelfEntries] = await Promise.all([
    db.readingEntry.findUnique({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
    }),
    db.review.findUnique({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
    }),
    db.shelf.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, isPublic: true },
      orderBy: { createdAt: "asc" },
    }),
    db.shelfEntry.findMany({
      where: { bookId: book.id, shelf: { userId: user.id } },
      select: { shelfId: true },
    }),
  ]);

  return NextResponse.json({
    bookId: book.id,
    entry,
    review,
    shelves,
    onShelves: onShelfEntries.map((e) => e.shelfId),
  });
}
