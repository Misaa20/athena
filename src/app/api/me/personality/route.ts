import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readingPersonality } from "@/lib/ai";

// GET /api/me/personality — the stored reading personality (if generated).
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({
    readerType: user.readerType,
    tasteProfile: user.tasteProfile,
    tasteUpdatedAt: user.tasteUpdatedAt?.toISOString() ?? null,
  });
}

// POST /api/me/personality — (re)generate from the user's library and store it.
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const entries = await db.readingEntry.findMany({
    where: { userId: user.id },
    include: { book: true },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  if (entries.length === 0) {
    return NextResponse.json({ error: "need_books" }, { status: 400 });
  }

  const personality = await readingPersonality(
    entries.map((e) => ({
      title: e.book.title,
      authors: e.book.authors,
      genres: e.book.genres,
      rating: e.rating ?? undefined,
      status: e.status,
    })),
  );

  const now = new Date();
  await db.user.update({
    where: { id: user.id },
    data: { readerType: personality.type, tasteProfile: personality.summary, tasteUpdatedAt: now },
  });

  return NextResponse.json({
    readerType: personality.type,
    tasteProfile: personality.summary,
    tasteUpdatedAt: now.toISOString(),
  });
}
