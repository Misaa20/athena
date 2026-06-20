import { NextResponse } from "next/server";
import { searchBooks } from "@/lib/books";
import { rateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/log";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "books:search", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    const results = await searchBooks(q, 20);
    return NextResponse.json({ results });
  } catch (err) {
    logError("books.search.failed", err, { queryLength: q.length });
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
