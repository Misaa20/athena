import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BookPayload, resolveBookId } from "@/lib/book-store";
import { rateLimit } from "@/lib/rate-limit";

const Body = z
  .object({
    body: z.string().min(1).max(5000),
    page: z.number().int().positive().optional(),
    kind: z.enum(["note", "quote"]).default("note"),
    isPublic: z.boolean().default(true),
    bookId: z.string().optional(),
    book: BookPayload.optional(),
  })
  .refine((d) => d.bookId || d.book, { message: "bookId or book is required" });

// POST /api/notes — save a note or quote against a book, as the current user.
// The user is taken from the verified Privy token, never from the body, and the
// book is resolved/upserted server-side so callers can't write to arbitrary
// users or non-existent books.
export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "notes:write", limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const { body, page, kind, isPublic } = parsed.data;

  const bookId = await resolveBookId({ bookId: parsed.data.bookId, book: parsed.data.book });
  if (!bookId) return NextResponse.json({ error: "book_not_found" }, { status: 404 });

  const data = { userId: user.id, bookId, body: body.trim(), page: page ?? null };
  const created =
    kind === "quote"
      ? await db.quote.create({ data: { ...data, isPublic } })
      : await db.note.create({ data });
  return NextResponse.json({ item: created, kind });
}
