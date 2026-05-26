import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const BookInput = z.object({
  externalId: z.string().optional(),
  isbn13: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  authors: z.array(z.string()).default([]),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  pageCount: z.number().int().positive().optional(),
  publishedYear: z.number().int().optional(),
  genres: z.array(z.string()).default([]),
});

// POST /api/books — upsert a book (called when a user adds a search result to their library)
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = BookInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const book = await db.book.upsert({
    where: data.externalId
      ? { externalId: data.externalId }
      : data.isbn13
        ? { isbn13: data.isbn13 }
        : { id: "" }, // forces create when no external identifiers
    update: data,
    create: data,
  });
  return NextResponse.json({ book });
}
