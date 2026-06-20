import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgresql://user:pass@localhost:5432/athena_test";
process.env.AUTH_TEST_BYPASS_SECRET ??= "test-secret";

const jsonHeaders = { "Content-Type": "application/json" };

function request(path: string, init: RequestInit = {}) {
  return new Request(`http://test.local${path}`, {
    ...init,
    headers: { ...jsonHeaders, ...(init.headers ?? {}) },
  });
}

function authed(path: string, userId: string, init: RequestInit = {}) {
  return request(path, {
    ...init,
    headers: {
      Authorization: `Bearer test:${process.env.AUTH_TEST_BYPASS_SECRET}:${userId}`,
      ...(init.headers ?? {}),
    },
  });
}

test("protected API routes return 401 without auth", async () => {
  const library = await import("../src/app/api/library/route");
  const reviews = await import("../src/app/api/reviews/route");
  const quotes = await import("../src/app/api/quotes/route");
  const shelves = await import("../src/app/api/me/shelves/route");
  const follow = await import("../src/app/api/follow/route");

  const cases = [
    () => library.GET(request("/api/library")),
    () => library.POST(request("/api/library", { method: "POST", body: "{}" })),
    () => reviews.GET(request("/api/reviews")),
    () => reviews.POST(request("/api/reviews", { method: "POST", body: "{}" })),
    () => quotes.GET(request("/api/quotes")),
    () => quotes.POST(request("/api/quotes", { method: "POST", body: "{}" })),
    () => shelves.GET(request("/api/me/shelves")),
    () => shelves.POST(request("/api/me/shelves", { method: "POST", body: "{}" })),
    () => follow.POST(request("/api/follow", { method: "POST", body: "{}" })),
  ];

  for (const call of cases) {
    const res = await call();
    assert.equal(res.status, 401);
  }
});

test(
  "library, reviews, quotes, shelves, follows, and book upserts work for the current user",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const { db } = await import("../src/lib/db");
    const books = await import("../src/app/api/books/route");
    const library = await import("../src/app/api/library/route");
    const reviews = await import("../src/app/api/reviews/route");
    const quotes = await import("../src/app/api/quotes/route");
    const shelves = await import("../src/app/api/me/shelves/route");
    const shelfBooks = await import("../src/app/api/me/shelves/[id]/books/route");
    const follow = await import("../src/app/api/follow/route");

    const stamp = Date.now();
    const userA = await db.user.create({
      data: {
        email: `tester-a-${stamp}@example.com`,
        username: `testera${stamp}`,
      },
    });
    const userB = await db.user.create({
      data: {
        email: `tester-b-${stamp}@example.com`,
        username: `testerb${stamp}`,
      },
    });

    const bookPayload = {
      externalId: `test-book-${stamp}`,
      title: "Production Readiness",
      authors: ["Athena Tests"],
      genres: ["testing"],
    };

    try {
      const firstBookRes = await books.POST(
        authed("/api/books", userA.id, { method: "POST", body: JSON.stringify(bookPayload) }),
      );
      const secondBookRes = await books.POST(
        authed("/api/books", userA.id, { method: "POST", body: JSON.stringify(bookPayload) }),
      );
      assert.equal(firstBookRes.status, 200);
      assert.equal(secondBookRes.status, 200);
      const firstBook = (await firstBookRes.json()) as { book: { id: string } };
      const secondBook = (await secondBookRes.json()) as { book: { id: string } };
      assert.equal(firstBook.book.id, secondBook.book.id);

      const libraryRes = await library.POST(
        authed("/api/library", userA.id, {
          method: "POST",
          body: JSON.stringify({ bookId: firstBook.book.id, status: "READING" }),
        }),
      );
      assert.equal(libraryRes.status, 200);

      const libraryListRes = await library.GET(authed("/api/library", userA.id));
      const libraryList = (await libraryListRes.json()) as { entries: unknown[] };
      assert.equal(libraryList.entries.length, 1);

      const reviewRes = await reviews.POST(
        authed("/api/reviews", userA.id, {
          method: "POST",
          body: JSON.stringify({ bookId: firstBook.book.id, rating: 5, body: "Useful." }),
        }),
      );
      assert.equal(reviewRes.status, 200);

      const quoteRes = await quotes.POST(
        authed("/api/quotes", userA.id, {
          method: "POST",
          body: JSON.stringify({ bookId: firstBook.book.id, body: "Ship with tests." }),
        }),
      );
      assert.equal(quoteRes.status, 200);

      const shelfRes = await shelves.POST(
        authed("/api/me/shelves", userA.id, {
          method: "POST",
          body: JSON.stringify({ name: "Beta reads", isPublic: false }),
        }),
      );
      assert.equal(shelfRes.status, 200);
      const shelf = (await shelfRes.json()) as { shelf: { id: string } };

      const shelfBookRes = await shelfBooks.POST(
        authed(`/api/me/shelves/${shelf.shelf.id}/books`, userA.id, {
          method: "POST",
          body: JSON.stringify({ bookId: firstBook.book.id }),
        }),
        { params: Promise.resolve({ id: shelf.shelf.id }) },
      );
      assert.equal(shelfBookRes.status, 200);

      const otherUserShelfAdd = await shelfBooks.POST(
        authed(`/api/me/shelves/${shelf.shelf.id}/books`, userB.id, {
          method: "POST",
          body: JSON.stringify({ bookId: firstBook.book.id }),
        }),
        { params: Promise.resolve({ id: shelf.shelf.id }) },
      );
      assert.equal(otherUserShelfAdd.status, 404);

      const followRes = await follow.POST(
        authed("/api/follow", userA.id, {
          method: "POST",
          body: JSON.stringify({ userId: userB.id }),
        }),
      );
      assert.equal(followRes.status, 200);

      const deleteLibraryRes = await library.DELETE(
        authed(`/api/library?bookId=${firstBook.book.id}`, userA.id, { method: "DELETE" }),
      );
      assert.equal(deleteLibraryRes.status, 200);
    } finally {
      await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
      await db.book.deleteMany({ where: { externalId: bookPayload.externalId } });
      await db.$disconnect();
    }
  },
);
