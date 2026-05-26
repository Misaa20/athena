import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const Body = z.object({
  userId: z.string(),
  bookId: z.string(),
  body: z.string().min(1),
  page: z.number().int().positive().optional(),
  kind: z.enum(["note", "quote"]).default("note"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const { userId, bookId, body, page, kind } = parsed.data;
  const created =
    kind === "quote"
      ? await db.quote.create({ data: { userId, bookId, body, page } })
      : await db.note.create({ data: { userId, bookId, body, page } });
  return NextResponse.json({ item: created, kind });
}
