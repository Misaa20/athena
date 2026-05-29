import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BookPayload, resolveBookId } from "@/lib/book-store";

// POST /api/books — upsert a book into the shared catalog (called when a user
// adds a search result to their library). Requires auth so anonymous callers
// can't overwrite catalog records, and delegates to resolveBookId so a payload
// without external identifiers is created once rather than re-created on every
// request (the old `where: { id: "" }` upsert minted a duplicate each time).
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BookPayload.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }

  const bookId = await resolveBookId({ book: parsed.data });
  if (!bookId) return NextResponse.json({ error: "book_not_found" }, { status: 404 });

  const book = await db.book.findUnique({ where: { id: bookId } });
  return NextResponse.json({ book });
}
