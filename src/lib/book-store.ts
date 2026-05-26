import { z } from "zod";
import { db } from "@/lib/db";
import { cleanDescription } from "@/lib/books";

// A catalog book the client wants to act on. When a book is reached from search
// results or shelves it isn't in our DB yet, so the client sends the full
// payload and we upsert it on demand (keyed by externalId / isbn13).
export const BookPayload = z.object({
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
export type BookPayload = z.infer<typeof BookPayload>;

/**
 * Resolve a request to a concrete Book id. Accepts either an existing `bookId`
 * (returned as-is after an existence check) or a catalog `book` payload, which
 * is upserted by externalId/isbn13 so repeated adds don't create duplicates.
 * Returns null when neither resolves to a real book.
 */
export async function resolveBookId(input: {
  bookId?: string;
  book?: BookPayload;
}): Promise<string | null> {
  if (input.bookId) {
    const exists = await db.book.findUnique({ where: { id: input.bookId }, select: { id: true } });
    return exists?.id ?? null;
  }
  if (!input.book) return null;
  // Strip catalog-injected piracy links / "Download PDF" lines before the
  // description hits the DB, so re-shelving a book also heals legacy spam.
  const data = { ...input.book, description: cleanDescription(input.book.description) };

  if (data.externalId) {
    const book = await db.book.upsert({
      where: { externalId: data.externalId },
      update: data,
      create: data,
    });
    return book.id;
  }
  if (data.isbn13) {
    const book = await db.book.upsert({
      where: { isbn13: data.isbn13 },
      update: data,
      create: data,
    });
    return book.id;
  }
  const created = await db.book.create({ data });
  return created.id;
}
