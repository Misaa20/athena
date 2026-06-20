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
npm run db:migrate:dev      # creates tables from prisma/migrations

# 4. seed (optional)
npx tsx prisma/seed.ts

# 5. run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The AI librarian works without an `OPENAI_API_KEY` — `src/lib/ai.ts` returns a curated fallback list so you can develop the UI offline.

## Production readiness

### Deploy database changes

Use migrations in production, not `prisma db push`:

```bash
npm run db:migrate:deploy
```

The initial migration enables `pgvector`, creates `Book.embedding vector(1536)`,
and creates the `book_embedding_idx` ivfflat index. Your database role must be
allowed to run `CREATE EXTENSION IF NOT EXISTS vector`.

For an existing non-migrated database, baseline it before deploying migrations
or create a fresh staging database and restore only the data you want to keep.

### Verify before sharing with testers

```bash
npm run lint
npm run build
npm test
```

`npm test` always checks unauthenticated API protection. CRUD integration tests
run only when `TEST_DATABASE_URL` points at a migrated throwaway database:

```powershell
$env:TEST_DATABASE_URL="postgresql://user:password@host/athena_test?schema=public"
npm run db:migrate:deploy
npm test
```

Do not point `TEST_DATABASE_URL` at production.

### Required production environment

- `DATABASE_URL`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- One AI provider key: `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENAI_API_KEY`
- Optional but recommended: `GOOGLE_BOOKS_API_KEY`
- Optional but recommended: `NEXT_PUBLIC_FEEDBACK_EMAIL`

In production, missing Privy config now fails loudly instead of silently
disabling auth.

### Manual setup before tester invites

- In Privy, add the deployed domain and callback URLs for email and Google login.
- Confirm email login and Google login on the deployed URL.
- Enable database backups on Neon/Supabase/Railway.
- Connect Vercel logs to your observability provider, or add Sentry/Axiom/Logtail
  credentials. The app logs structured errors for AI and catalog failures.
- Seed staging with `npm run db:seed` so testers land in a populated community.
- Set `NEXT_PUBLIC_FEEDBACK_EMAIL` so `/feedback` sends tester reports to the
  right inbox.

### Security and privacy model

- Notes are private to the signed-in user.
- Shelves are public or private via `Shelf.isPublic`.
- Reviews and quotes are public by default, with `isPublic` flags in the schema.
  Public profile, book, and feed reads filter to public reviews/quotes only.
- Mutating routes and expensive catalog/AI routes have basic in-memory rate
  limits. For multi-region/high-volume production, move these limits to a shared
  store such as Upstash Redis.

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
