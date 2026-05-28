import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBooksByAuthorInSubject, type BookSearchResult } from "@/lib/books";

// Per-user, per-genre shelf. For each distinct author in the caller's library
// (any shelf — read, reading, want, DNF), look up that author's titles in the
// requested subject and merge the results. Capped tight on author count and
// per-author results so the fan-out stays bounded.
//
// GET /api/me/authors-in-subject?subject=romance
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const subject = new URL(req.url).searchParams.get("subject");
  if (!subject) return NextResponse.json({ error: "missing_subject" }, { status: 400 });

  const entries = await db.readingEntry.findMany({
    where: { userId: user.id },
    include: { book: { select: { authors: true, externalId: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  // Track which book ids the user already has on a shelf so we don't recommend
  // them their own library back.
  const ownedExternalIds = new Set(
    entries.map((e) => e.book.externalId).filter((id): id is string => Boolean(id)),
  );

  // Author order = most-recently-touched first; keep up to 8 to bound the fan.
  const authors: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    for (const a of e.book.authors) {
      const key = a.trim();
      if (!key || seen.has(key.toLowerCase())) continue;
      seen.add(key.toLowerCase());
      authors.push(key);
      if (authors.length >= 8) break;
    }
    if (authors.length >= 8) break;
  }

  if (authors.length === 0) return NextResponse.json({ books: [] });

  const perAuthor = await Promise.all(
    authors.map((a) => getBooksByAuthorInSubject(a, subject, 4)),
  );

  // Deduplicate by external id, drop books the user already has, cap to 18.
  const merged: BookSearchResult[] = [];
  const byId = new Set<string>();
  for (const list of perAuthor) {
    for (const b of list) {
      if (byId.has(b.externalId) || ownedExternalIds.has(b.externalId)) continue;
      byId.add(b.externalId);
      merged.push(b);
      if (merged.length >= 18) break;
    }
    if (merged.length >= 18) break;
  }

  return NextResponse.json({ books: merged });
}
