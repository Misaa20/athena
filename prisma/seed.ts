import { PrismaClient, ReadingStatus } from "@prisma/client";

const db = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────
// Athena demo seed. Creates a small but lively community of fictional readers
// so the feed, profiles, and book pages feel inhabited on a fresh database.
// Re-runnable: it deletes and recreates the demo readers (by username) each
// time, and never touches real accounts.
// ─────────────────────────────────────────────────────────────────────────

// --- tiny RNG helpers -----------------------------------------------------
const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: T[]): T => arr[rand(arr.length)];
const chance = (p: number) => Math.random() < p;
function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(rand(copy.length), 1)[0]);
  return out;
}
function daysAgo(d: number) {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date;
}

// --- the catalog (fetched live from OpenLibrary for real covers/metadata) --
const CATALOG: { title: string; author: string; genres: string[] }[] = [
  { title: "Stoner", author: "John Williams", genres: ["Literary Fiction"] },
  { title: "The Secret History", author: "Donna Tartt", genres: ["Literary Fiction", "Mystery"] },
  { title: "Klara and the Sun", author: "Kazuo Ishiguro", genres: ["Literary Fiction", "Science Fiction"] },
  { title: "Never Let Me Go", author: "Kazuo Ishiguro", genres: ["Literary Fiction", "Science Fiction"] },
  { title: "The Remains of the Day", author: "Kazuo Ishiguro", genres: ["Literary Fiction"] },
  { title: "Beloved", author: "Toni Morrison", genres: ["Literary Fiction", "History"] },
  { title: "The Name of the Rose", author: "Umberto Eco", genres: ["Historical Fiction", "Mystery"] },
  { title: "Norwegian Wood", author: "Haruki Murakami", genres: ["Literary Fiction"] },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky", genres: ["Classics", "Philosophy"] },
  { title: "The Master and Margarita", author: "Mikhail Bulgakov", genres: ["Classics", "Fantasy"] },
  { title: "The Sense of an Ending", author: "Julian Barnes", genres: ["Literary Fiction"] },
  { title: "Convenience Store Woman", author: "Sayaka Murata", genres: ["Literary Fiction"] },
  { title: "A Little Life", author: "Hanya Yanagihara", genres: ["Literary Fiction"] },
  { title: "The Goldfinch", author: "Donna Tartt", genres: ["Literary Fiction"] },
  { title: "Pachinko", author: "Min Jin Lee", genres: ["Historical Fiction"] },
  { title: "Wolf Hall", author: "Hilary Mantel", genres: ["Historical Fiction"] },
  { title: "The Bell Jar", author: "Sylvia Plath", genres: ["Classics", "Literary Fiction"] },
  { title: "Dune", author: "Frank Herbert", genres: ["Science Fiction"] },
  { title: "Piranesi", author: "Susanna Clarke", genres: ["Fantasy", "Literary Fiction"] },
  { title: "The Idiot", author: "Elif Batuman", genres: ["Literary Fiction"] },
];

type SeedBook = {
  externalId: string;
  isbn13?: string;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  pageCount?: number;
  publishedYear?: number;
  genres: string[];
};

type OLDoc = {
  key: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  subject?: string[];
  isbn?: string[];
};

async function fetchBook(entry: { title: string; author: string; genres: string[] }): Promise<SeedBook> {
  const fallback: SeedBook = {
    externalId: `seed-${entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: entry.title,
    authors: [entry.author],
    genres: entry.genres,
  };
  try {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("title", entry.title);
    url.searchParams.set("author", entry.author);
    url.searchParams.set("limit", "1");
    url.searchParams.set(
      "fields",
      "key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,isbn",
    );
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { docs?: OLDoc[] };
    const doc = data.docs?.[0];
    if (!doc) return fallback;
    return {
      externalId: `ol:${doc.key}`,
      isbn13: doc.isbn?.find((i) => i.length === 13),
      title: doc.title ?? entry.title,
      authors: doc.author_name?.length ? doc.author_name.slice(0, 2) : [entry.author],
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
      pageCount: doc.number_of_pages_median ?? undefined,
      publishedYear: doc.first_publish_year ?? undefined,
      genres: entry.genres,
    };
  } catch {
    return fallback;
  }
}

// --- the readers ----------------------------------------------------------
const READERS: {
  username: string;
  displayName: string;
  bio: string;
  readerType: string;
  tasteProfile: string;
}[] = [
  {
    username: "maya",
    displayName: "Maya Chen",
    bio: "Slow reader, fast underliner. Tea-stained paperbacks only.",
    readerType: "The Melancholy Wanderer",
    tasteProfile:
      "Maya gravitates to quiet, devastating novels where not much happens and everything does. Ishiguro, Williams, the ache of ordinary lives — her shelves are a study in restraint. She could stand to let a little plot in once in a while.",
  },
  {
    username: "theo",
    displayName: "Theo Okafor",
    bio: "Dark academia apologist. If it has a library and a secret, I'm in.",
    readerType: "The Cloistered Romantic",
    tasteProfile:
      "Theo loves books that smell of old paper and bad decisions — campus mysteries, doorstop classics, anything Donna Tartt. There's a streak of grandeur to his taste, and a soft spot for beautiful people behaving terribly.",
  },
  {
    username: "lena",
    displayName: "Lena Varga",
    bio: "Translated fiction evangelist. Currently somewhere in Eastern Europe (in a book).",
    readerType: "The Border-Crosser",
    tasteProfile:
      "Lena reads the world — Bulgakov, Murata, Dostoevsky — chasing voices from everywhere but home. She's drawn to the strange and the philosophical, and rarely meets a 600-page Russian novel she doesn't like.",
  },
  {
    username: "sam",
    displayName: "Sam Rivers",
    bio: "Sci-fi with a soul. Robots that feel things, mostly.",
    readerType: "The Tender Futurist",
    tasteProfile:
      "Sam likes the future when it's heartbreaking — Klara, Dune, anything where technology asks what makes us human. Big ideas, bigger feelings. A literary novel sneaks onto the shelf now and then and stays.",
  },
  {
    username: "noor",
    displayName: "Noor Haddad",
    bio: "Historical fiction, generational sagas, books that make me cry on trains.",
    readerType: "The Keeper of Lineages",
    tasteProfile:
      "Noor loves the long view — Pachinko, Wolf Hall, families carried across centuries. She reads for sweep and sorrow, and a book earns five stars only if it ruins her a little.",
  },
  {
    username: "eli",
    displayName: "Eli Sokolov",
    bio: "Reformed plot-skimmer learning to love a slow burn.",
    readerType: "The Convert",
    tasteProfile:
      "Eli came for the thrillers and stayed for the prose. His shelves show a reader mid-transformation — half page-turners, half quiet literary fiction he'd have skipped a year ago.",
  },
  {
    username: "priya",
    displayName: "Priya Nair",
    bio: "Annotating in pen like a menace. Quotes are my love language.",
    readerType: "The Marginalia Maximalist",
    tasteProfile:
      "Priya reads with a pen in hand and leaves nothing unhighlighted. She loves sentence-level writers — Barnes, Plath, Morrison — and judges a book by how many lines she had to stop and copy out.",
  },
  {
    username: "marco",
    displayName: "Marco Bianchi",
    bio: "Classics, philosophy, and the occasional 5am existential crisis.",
    readerType: "The Restless Thinker",
    tasteProfile:
      "Marco reads to argue with the dead. Dostoevsky, Eco, the big questions in fat old books. His ratings are stingy and his reviews are essays — a hard reader to impress, a great one to follow.",
  },
  {
    username: "june",
    displayName: "June Park",
    bio: "Cozy mysteries, sad girl lit, and snacks. Balance.",
    readerType: "The Mood Reader",
    tasteProfile:
      "June reads by feel, not by plan — whatever the week calls for. Her shelves swing from melancholy literary fiction to comfort reads, united only by impeccable vibes.",
  },
  {
    username: "amir",
    displayName: "Amir Reza",
    bio: "One book at a time, finished or it doesn't count.",
    readerType: "The Completionist",
    tasteProfile:
      "Amir doesn't DNF. He reads deliberately and finishes everything, which gives his five stars real weight. Drawn to ambitious, demanding novels he can sink a month into.",
  },
  {
    username: "tara",
    displayName: "Tara Lindqvist",
    bio: "Reading goal: more than last year. Spreadsheet enthusiast.",
    readerType: "The Quiet Competitor",
    tasteProfile:
      "Tara loves a reading challenge and the satisfaction of a filled-in shelf. Broad taste, steady pace, and a genuine joy in counting — the friend who'll out-read you and be lovely about it.",
  },
  {
    username: "dev",
    displayName: "Dev Malhotra",
    bio: "Short books, long thoughts. Under 250 pages preferred.",
    readerType: "The Miniaturist",
    tasteProfile:
      "Dev believes the best novels are short ones — Murata, Barnes, the perfectly compressed. He reads a lot precisely because he reads small, and has strong opinions about anything over 400 pages.",
  },
];

const REVIEW_BODIES = [
  "Quietly devastating. I kept putting it down just to sit with a single sentence.",
  "Not what I expected — slower, sadder, and so much better for it.",
  "The prose does that rare thing where you forget you're reading at all.",
  "I finished this on a train and had to stare out the window for a while.",
  "A perfect, aching little book. I'll be pressing it on everyone this year.",
  "Brilliant in flashes, frustrating in others — but I haven't stopped thinking about it.",
  "It earns every page. The ending reframes everything that came before.",
  "Cold and precise and somehow heartbreaking. A strange spell of a novel.",
  "I underlined half of it. The other half I'll get on the reread.",
  "More atmosphere than plot, and exactly what I needed right now.",
  "Overhyped, maybe — but the middle section alone is worth it.",
  "The kind of book that makes you want to write, or at least read better.",
  "Gorgeous and a little self-indulgent. I forgave it everything by the end.",
  "Read it in two sittings. Already want to start again from the top.",
  "It broke my heart efficiently and then handed it back. Five stars.",
  "Didn't love the pacing, but the final chapter is doing things I can't shake.",
];

const QUOTE_BODIES = [
  "We are, in the end, the sum of the books that changed us.",
  "There are years that ask questions and years that answer.",
  "He had never learned how to say the things that mattered most, and so he kept them.",
  "The past is never where you think you left it.",
  "To read is to carry someone else's silence for a while.",
  "She loved him the way one loves a city — for its ruins as much as its lights.",
  "Grief is just love with nowhere to go.",
  "Some doors you walk through become the rooms you live in forever.",
];

const COMMENTS = [
  "Adding this to my list immediately.",
  "You've completely convinced me.",
  "I had the opposite reaction to the ending — let's argue about it.",
  "One of my favorites too. So glad you loved it.",
  "Been on the fence about this one. Not anymore.",
  "This review is better than most of the book reviews I get paid to read.",
  "Okay okay, fine, I'll finally start it.",
];

async function main() {
  const usernames = READERS.map((r) => r.username);

  // Clean slate for demo readers only (cascades remove their entries, reviews,
  // quotes, follows, likes, comments). Real accounts are never touched.
  await db.user.deleteMany({ where: { username: { in: usernames } } });

  // Upsert the catalog (fetched in parallel for real covers/metadata).
  console.log(`Fetching ${CATALOG.length} books from OpenLibrary…`);
  const seedBooks = await Promise.all(CATALOG.map(fetchBook));
  const books = await Promise.all(
    seedBooks.map((b) =>
      db.book.upsert({
        where: { externalId: b.externalId },
        update: { coverUrl: b.coverUrl, genres: b.genres },
        create: b,
      }),
    ),
  );
  console.log(`Catalog ready (${books.filter((b) => b.coverUrl).length}/${books.length} with covers).`);

  // Create readers.
  const users = await Promise.all(
    READERS.map((r) =>
      db.user.create({
        data: {
          email: `${r.username}@athena.demo`,
          username: r.username,
          displayName: r.displayName,
          bio: r.bio,
          readerType: r.readerType,
          tasteProfile: r.tasteProfile,
          tasteUpdatedAt: new Date(),
          createdAt: daysAgo(rand(300) + 30),
        },
      }),
    ),
  );

  const allReviewIds: string[] = [];

  // Shelves, reviews, quotes, goals per reader.
  for (const user of users) {
    const shelf = sample(books, 6 + rand(7)); // 6–12 books each
    const finishedThisYear: string[] = [];

    for (const book of shelf) {
      const roll = Math.random();
      const status: ReadingStatus =
        roll < 0.5 ? "FINISHED" : roll < 0.7 ? "READING" : roll < 0.95 ? "WANT_TO_READ" : "DNF";
      const rating =
        status === "FINISHED" || status === "DNF"
          ? pick([3, 4, 4, 5, 5, 5, 2])
          : null;
      const finishedAt = status === "FINISHED" ? daysAgo(rand(330)) : null;
      if (finishedAt && finishedAt.getFullYear() === new Date().getFullYear()) {
        finishedThisYear.push(book.id);
      }

      await db.readingEntry.create({
        data: {
          userId: user.id,
          bookId: book.id,
          status,
          rating,
          startedAt: status === "READING" || status === "FINISHED" ? daysAgo(rand(60) + 5) : null,
          finishedAt,
        },
      });

      // Reviews for most finished books.
      if (status === "FINISHED" && rating && chance(0.65)) {
        const review = await db.review.create({
          data: {
            userId: user.id,
            bookId: book.id,
            rating,
            body: pick(REVIEW_BODIES),
            createdAt: finishedAt ?? daysAgo(rand(120)),
          },
        });
        allReviewIds.push(review.id);
      }

      // A few quotes from finished books.
      if (status === "FINISHED" && chance(0.3)) {
        await db.quote.create({
          data: {
            userId: user.id,
            bookId: book.id,
            body: pick(QUOTE_BODIES),
            page: chance(0.6) ? rand(300) + 10 : null,
          },
        });
      }
    }

    // Reading goal for the current year, scaled to feel attainable.
    const read = finishedThisYear.length;
    await db.readingGoal.create({
      data: {
        userId: user.id,
        year: new Date().getFullYear(),
        target: pick([12, 20, 24, 24, 30, 40, 52]),
      },
    });
    void read;
  }

  // Follow graph: everyone follows a handful of others.
  for (const user of users) {
    const others = users.filter((u) => u.id !== user.id);
    for (const target of sample(others, 3 + rand(4))) {
      await db.follow.upsert({
        where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
        create: { followerId: user.id, followingId: target.id },
        update: {},
      });
    }
  }

  // Likes + comments to make reviews feel social.
  for (const reviewId of allReviewIds) {
    const likers = sample(users, rand(6));
    for (const liker of likers) {
      await db.reviewLike.upsert({
        where: { userId_reviewId: { userId: liker.id, reviewId } },
        create: { userId: liker.id, reviewId },
        update: {},
      });
    }
    if (chance(0.3)) {
      for (const commenter of sample(users, 1 + rand(2))) {
        await db.reviewComment.create({
          data: { userId: commenter.id, reviewId, body: pick(COMMENTS) },
        });
      }
    }
  }

  console.log(
    `Seeded ${users.length} readers, ${books.length} books, ${allReviewIds.length} reviews, plus quotes, follows, likes & comments.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
