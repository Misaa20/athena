import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Count books the user finished within a calendar year.
async function booksReadInYear(userId: string, year: number) {
  return db.readingEntry.count({
    where: {
      userId,
      status: "FINISHED",
      finishedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
    },
  });
}

// GET /api/me/goal?year=YYYY — the user's goal + progress for a year.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const yearParam = new URL(req.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  const [goal, read] = await Promise.all([
    db.readingGoal.findUnique({ where: { userId_year: { userId: user.id, year } } }),
    booksReadInYear(user.id, year),
  ]);

  return NextResponse.json({ year, target: goal?.target ?? null, read });
}

const Body = z.object({
  target: z.number().int().min(1).max(1000),
  year: z.number().int().min(2000).max(2100).optional(),
});

// PUT /api/me/goal { target, year? } — set/update the annual goal.
export async function PUT(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const year = parsed.data.year ?? new Date().getFullYear();
  const goal = await db.readingGoal.upsert({
    where: { userId_year: { userId: user.id, year } },
    create: { userId: user.id, year, target: parsed.data.target },
    update: { target: parsed.data.target },
  });
  const read = await booksReadInYear(user.id, year);
  return NextResponse.json({ year, target: goal.target, read });
}
