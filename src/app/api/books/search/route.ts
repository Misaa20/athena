import { NextResponse } from "next/server";
import { searchBooks } from "@/lib/books";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    const results = await searchBooks(q, 20);
    return NextResponse.json({ results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
