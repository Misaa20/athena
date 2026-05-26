import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recommendBooks } from "@/lib/ai";

const Body = z.object({
  prompt: z.string().min(2),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const { prompt } = parsed.data;

  // If the request is authenticated, ground recommendations in the user's most
  // recent reads so the librarian can reason about what they actually read.
  const user = await getCurrentUser(req);
  const recentBooks = user
    ? (
        await db.readingEntry.findMany({
          where: { userId: user.id },
          include: { book: true },
          orderBy: { updatedAt: "desc" },
          take: 15,
        })
      ).map((e) => ({
        title: e.book.title,
        authors: e.book.authors,
        genres: e.book.genres,
        status: e.status,
        rating: e.rating ?? undefined,
      }))
    : [];

  try {
    const recommendations = await recommendBooks({ prompt, recentBooks });
    return NextResponse.json({ recommendations, usedLibrary: recentBooks.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "ai_failed" }, { status: 500 });
  }
}
