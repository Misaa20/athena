import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { missingProductionEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const missingEnv = missingProductionEnv();
  const started = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        database: "unreachable",
        missingEnv,
        latencyMs: Date.now() - started,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: missingEnv.length === 0,
    database: "ok",
    missingEnv,
    latencyMs: Date.now() - started,
  });
}
