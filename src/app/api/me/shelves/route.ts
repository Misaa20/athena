import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const CreateBody = z.object({
  name: z.string().trim().min(1).max(60),
  isPublic: z.boolean().default(true),
});

// GET /api/me/shelves — current user's custom shelves with book counts and a
// few cover thumbnails for previews.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const shelves = await db.shelf.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { entries: true } },
      entries: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { book: { select: { id: true, title: true, coverUrl: true, authors: true } } },
      },
    },
  });
  return NextResponse.json({ shelves });
}

// POST /api/me/shelves { name, isPublic? } — create a new shelf.
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const shelf = await db.shelf.create({
      data: { userId: user.id, name: parsed.data.name, isPublic: parsed.data.isPublic },
    });
    return NextResponse.json({ shelf });
  } catch (err) {
    // Unique constraint on (userId, name) — friendlier error than 500.
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "name_taken" }, { status: 409 });
    }
    throw err;
  }
}
