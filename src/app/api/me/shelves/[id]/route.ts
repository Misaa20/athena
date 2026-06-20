import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const PatchBody = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.isPublic !== undefined, {
    message: "name or isPublic is required",
  });

// PATCH /api/me/shelves/[id] — rename or toggle visibility.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { name: "shelves:write", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  // Confirm the shelf belongs to this user before mutating.
  const owned = await db.shelf.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const shelf = await db.shelf.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ shelf });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "name_taken" }, { status: 409 });
    }
    throw err;
  }
}

// DELETE /api/me/shelves/[id] — drop the shelf and its entries.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { name: "shelves:write", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const result = await db.shelf.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
