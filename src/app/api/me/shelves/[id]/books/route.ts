import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BookPayload, resolveBookId } from "@/lib/book-store";
import { rateLimit } from "@/lib/rate-limit";

const AddBody = z
  .object({
    bookId: z.string().optional(),
    book: BookPayload.optional(),
  })
  .refine((d) => d.bookId || d.book, { message: "bookId or book is required" });

// POST /api/me/shelves/[id]/books — add a book to a shelf (idempotent).
// Accepts a known bookId or a catalog payload (upserted on the fly).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { name: "shelf-books:write", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const owned = await db.shelf.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "shelf_not_found" }, { status: 404 });

  const parsed = AddBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const resolvedBookId = await resolveBookId(parsed.data);
  if (!resolvedBookId) return NextResponse.json({ error: "book_not_found" }, { status: 404 });

  // Upsert — repeat adds shouldn't 409.
  await db.shelfEntry.upsert({
    where: { shelfId_bookId: { shelfId: id, bookId: resolvedBookId } },
    update: {},
    create: { shelfId: id, bookId: resolvedBookId },
  });
  return NextResponse.json({ ok: true });
}

// DELETE /api/me/shelves/[id]/books?bookId=... — remove from shelf.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { name: "shelf-books:write", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const bookId = new URL(req.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "missing_book" }, { status: 400 });

  const owned = await db.shelf.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "shelf_not_found" }, { status: 404 });

  await db.shelfEntry.deleteMany({ where: { shelfId: id, bookId } });
  return NextResponse.json({ ok: true });
}
