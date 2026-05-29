import { NextResponse } from "next/server";
import { getSubjectPage } from "@/lib/books";

type Ctx = { params: Promise<{ subject: string }> };

const PAGE_SIZE = 24;

// GET /api/browse/[subject]?offset=N — a page of books for a genre, used by the
// genre page's "Load more" button. Public; mirrors getSubjectPage's shape.
export async function GET(req: Request, { params }: Ctx) {
  const { subject } = await params;
  const offsetParam = Number(new URL(req.url).searchParams.get("offset"));
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? Math.floor(offsetParam) : 0;

  const { books, total, ok, nextOffset, hasMore } = await getSubjectPage(
    subject,
    PAGE_SIZE,
    offset,
  );
  return NextResponse.json({
    books,
    total,
    ok,
    // getSubjectPage advances the offset by however many raw works it consumed
    // to fill the page (it drops cover-less / non-English titles), so resuming
    // from nextOffset never skips or repeats books.
    nextOffset,
    // Keep the button available after a transient failure so the user can retry.
    hasMore: ok ? hasMore : true,
  });
}
