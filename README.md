# Athena

An AI-powered reading companion that helps users **track, understand, remember, and discover** books.

Goodreads is a spreadsheet with ads. Athena is a quiet, beautiful library with an AI librarian who actually pays attention.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom ink/accent palette and a serif display face
- **Prisma** + **PostgreSQL** + **pgvector** (for semantic recommendations)
- **OpenAI** (Gemini is a drop-in swap — see `src/lib/ai.ts`)
- **Google Books API** for book metadata (optional key)

## Project layout

```
prisma/
  schema.prisma         Users, Books, ReadingEntries, Reviews, Notes, Quotes, Follows
  seed.ts               Tiny seed: one user + one book

src/
  app/
    page.tsx            Landing
    dashboard/          Logged-in home
    library/            Your shelves + add books
    librarian/          AI librarian (natural-language recs)
    books/[id]/         Book detail
    u/[username]/       Public reader profile
    login/ signup/      Auth pages (UI only — wire auth of your choice)
    api/
      books/search      GET — search Google Books
      books             POST — upsert a book
      library           GET / POST — your reading entries
      reviews           POST — upsert a review
      notes             POST — add note or quote
      recommend         POST — AI recommendations

  components/
    ui/                 Button, Card, Input
    nav.tsx             Top nav
    book-card.tsx       Cover + title + authors

  lib/
    db.ts               Prisma client (singleton)
    ai.ts               recommendBooks() + summarizeReading()
    books.ts            Google Books client
    utils.ts            cn(), formatDate()
```

## Getting started

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env
# fill in DATABASE_URL and (optionally) OPENAI_API_KEY

# 3. database
npx prisma db push          # creates tables
# then enable pgvector once, in psql or your DB UI:
#   CREATE EXTENSION IF NOT EXISTS vector;
#   ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS embedding vector(1536);
#   CREATE INDEX IF NOT EXISTS book_embedding_idx ON "Book" USING ivfflat (embedding vector_cosine_ops);

# 4. seed (optional)
npx tsx prisma/seed.ts

# 5. run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The AI librarian works without an `OPENAI_API_KEY` — `src/lib/ai.ts` returns a curated fallback list so you can develop the UI offline.

## MVP scope

1. Auth (Privy — UI is wired; add `NEXT_PUBLIC_PRIVY_APP_ID` from https://dashboard.privy.io)
2. Search & add books (Google Books)
3. Reading status: Want → Reading → Finished
4. Reviews + ratings
5. Notes + quotes per book
6. AI librarian (natural-language recs)
7. AI reading-memory page when a book is marked FINISHED
8. Public reader profile at `/u/[username]`

## Beyond MVP

- Semantic recommendations using `Book.embedding` (pgvector cosine search)
- Follow other readers; activity feed
- Book clubs / shared shelves
- Yearly Wrapped: AI-generated reading retrospective
- Browser extension to clip quotes while reading on the web
- Mobile (React Native or PWA)

## Positioning

Not "a Goodreads clone." Say:

> **Athena is an AI-powered reading companion that helps you track, understand, remember, and discover books.**
