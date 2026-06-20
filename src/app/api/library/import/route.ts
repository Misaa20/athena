import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  countGoodreadsDataRows,
  parseGoodreadsCsv,
  summarizeGoodreadsImport,
} from "@/lib/goodreads-import";

const MAX_CSV_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "library:import", limit: 4, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const csv = await readCsvBody(req);
  if (!csv) return NextResponse.json({ error: "missing_csv" }, { status: 400 });
  if (new TextEncoder().encode(csv).length > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "csv_too_large" }, { status: 413 });
  }

  const sourceRows = countGoodreadsDataRows(csv);
  const entries = parseGoodreadsCsv(csv);
  if (entries.length === 0) {
    return NextResponse.json({ error: "no_importable_books" }, { status: 400 });
  }

  let imported = 0;
  let notes = 0;

  for (const entry of entries) {
    const book = await upsertImportedBook(entry.book);

    await db.readingEntry.upsert({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
      update: {
        status: entry.status,
        rating: entry.rating,
        startedAt: entry.startedAt,
        finishedAt: entry.finishedAt,
      },
      create: {
        userId: user.id,
        bookId: book.id,
        status: entry.status,
        rating: entry.rating,
        startedAt: entry.startedAt,
        finishedAt: entry.finishedAt,
      },
    });

    if (entry.privateNote) {
      const existingNote = await db.note.findFirst({
        where: { userId: user.id, bookId: book.id, body: entry.privateNote },
        select: { id: true },
      });
      if (!existingNote) {
        await db.note.create({
          data: {
            userId: user.id,
            bookId: book.id,
            body: entry.privateNote,
          },
        });
        notes++;
      }
    }

    imported++;
  }

  const summary = summarizeGoodreadsImport(entries, sourceRows);
  return NextResponse.json({ summary: { ...summary, imported, notes } });
}

async function readCsvBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (file instanceof File) return file.text();
    const csv = form.get("csv");
    return typeof csv === "string" ? csv : "";
  }

  return req.text();
}

async function upsertImportedBook(book: {
  externalId: string;
  isbn13?: string;
  title: string;
  authors: string[];
  pageCount?: number;
  publishedYear?: number;
}) {
  if (book.isbn13) {
    const existingByIsbn = await db.book.findUnique({ where: { isbn13: book.isbn13 } });
    if (existingByIsbn) {
      return db.book.update({
        where: { id: existingByIsbn.id },
        data: {
          title: book.title,
          authors: book.authors,
          pageCount: book.pageCount,
          publishedYear: book.publishedYear,
        },
      });
    }
  }

  return db.book.upsert({
    where: { externalId: book.externalId },
    update: {
      isbn13: book.isbn13,
      title: book.title,
      authors: book.authors,
      pageCount: book.pageCount,
      publishedYear: book.publishedYear,
    },
    create: {
      externalId: book.externalId,
      isbn13: book.isbn13,
      title: book.title,
      authors: book.authors,
      pageCount: book.pageCount,
      publishedYear: book.publishedYear,
      genres: [],
    },
  });
}
