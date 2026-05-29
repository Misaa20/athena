// Book metadata client. Tries Google Books first, falls back to OpenLibrary
// when Google rate-limits (very common on the free anonymous quota) or errors.
const GOOGLE_BOOKS = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_COVERS = "https://covers.openlibrary.org/b/id";

// OpenLibrary's edge now 403s requests whose User-Agent looks bot-like or custom
// (an anti-scraper measure), while letting browser-like UAs through. Node's fetch
// sends no UA at all, so every catalog request must go through this helper with a
// browser UA — otherwise the JSON endpoints return a 403 HTML page that then
// fails to parse, leaving every shelf empty.
const CATALOG_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// Hard timeout on every catalog request. Without this, Node's fetch can stall
// for ~60s on IPv6 connect timeouts when OL/Google routes flap, which then
// cascades into 500s on the search/detail routes (or hangs the whole page).
// Callers that fan out many requests (landing shelves) can keep the default;
// single-book detail lookups should pass a longer timeout — a 6s ceiling is
// brutal when OL is responding in 8–10s from a Vercel cold start, and a
// single 404 there feels like the app is broken.
async function catalogFetch(url: string | URL, revalidate: number, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": CATALOG_UA, Accept: "application/json" },
      next: { revalidate },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export type BookSearchResult = {
  externalId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  pageCount?: number;
  publishedYear?: number;
  isbn13?: string;
  genres: string[];
  /** 0–5 average rating from the source catalog, when available. */
  averageRating?: number;
  /** Number of ratings backing the average. */
  ratingsCount?: number;
};

export async function searchBooks(query: string, limit = 20): Promise<BookSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const results = await searchGoogleBooks(query, limit);
    if (results.length > 0) return results;
  } catch (err) {
    console.warn("Google Books unavailable, falling back to OpenLibrary:", (err as Error).message);
  }
  return searchOpenLibrary(query, limit);
}

async function searchGoogleBooks(query: string, limit: number): Promise<BookSearchResult[]> {
  const url = new URL(GOOGLE_BOOKS);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(limit));
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }
  const res = await catalogFetch(url, 60 * 60);
  if (!res.ok) throw new Error(`Google Books error: ${res.status}`);
  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items ?? []).map(toBook);
}

async function searchOpenLibrary(query: string, limit: number): Promise<BookSearchResult[]> {
  const url = new URL(OPEN_LIBRARY);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  const res = await catalogFetch(url, 60 * 60);
  if (!res.ok) throw new Error(`OpenLibrary error: ${res.status}`);
  const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
  return (data.docs ?? []).map(fromOpenLibrary);
}

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
    averageRating?: number;
    ratingsCount?: number;
  };
};

type OpenLibraryDoc = {
  key: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  cover_i?: number;
  subject?: string[];
};

function fromOpenLibrary(d: OpenLibraryDoc): BookSearchResult {
  return {
    externalId: `ol:${d.key}`,
    title: d.title ?? "Untitled",
    subtitle: d.subtitle,
    authors: d.author_name ?? [],
    coverUrl: d.cover_i ? `${OPEN_LIBRARY_COVERS}/${d.cover_i}-M.jpg` : undefined,
    pageCount: d.number_of_pages_median,
    publishedYear: d.first_publish_year,
    isbn13: d.isbn?.find((i) => i.length === 13),
    genres: (d.subject ?? []).slice(0, 6),
  };
}

// --- Landing-page shelves -------------------------------------------------
// These use OpenLibrary's trending + subjects endpoints. They need no API key,
// are not rate-limited like Google's anonymous quota, and reliably include
// cover ids — which is exactly what the homepage shelves need.

const OPEN_LIBRARY_TRENDING = "https://openlibrary.org/trending/daily.json";
const OPEN_LIBRARY_SUBJECT = "https://openlibrary.org/subjects";

export type SubGenre = { label: string; subject: string };
export type Category = {
  label: string;
  subject: string;
  description: string;
  featured?: boolean;
  subGenres?: SubGenre[];
};

// Genres available across the app. `featured` ones get a full shelf on the
// /browse landing page (kept small so the page isn't fetching dozens of shelves
// at once); the rest still appear in the nav menu and have their own genre page.
// `subGenres` use real OpenLibrary subject slugs so each one has a working
// /browse/[slug] page (the route accepts arbitrary subjects).
export const CATEGORIES: Category[] = [
  {
    label: "Fiction",
    subject: "fiction",
    featured: true,
    description: "Invented worlds and the stories we can’t put down.",
    subGenres: [
      { label: "Literary", subject: "literary_fiction" },
      { label: "Contemporary", subject: "contemporary_fiction" },
      { label: "Historical", subject: "historical_fiction" },
      { label: "Short stories", subject: "short_stories" },
      { label: "Satire", subject: "satire" },
    ],
  },
  {
    label: "Science Fiction",
    subject: "science_fiction",
    featured: true,
    description: "Futures, far-off worlds, and what-ifs grounded in science.",
    subGenres: [
      { label: "Space opera", subject: "space_opera" },
      { label: "Cyberpunk", subject: "cyberpunk" },
      { label: "Dystopian", subject: "dystopian" },
      { label: "Time travel", subject: "time_travel" },
      { label: "Hard sci-fi", subject: "hard_science_fiction" },
      { label: "Alternate history", subject: "alternate_history" },
    ],
  },
  {
    label: "Fantasy",
    subject: "fantasy",
    featured: true,
    description: "Magic, myth, and epic quests beyond the edge of the map.",
    subGenres: [
      { label: "Epic fantasy", subject: "epic_fantasy" },
      { label: "Urban fantasy", subject: "urban_fantasy" },
      { label: "Dark fantasy", subject: "dark_fantasy" },
      { label: "High fantasy", subject: "high_fantasy" },
      { label: "Sword & sorcery", subject: "sword_and_sorcery" },
      { label: "Mythology", subject: "mythology" },
    ],
  },
  {
    label: "Mystery & Thriller",
    subject: "mystery",
    featured: true,
    description: "Whodunits, twists, and pages that turn themselves.",
    subGenres: [
      { label: "Cozy mystery", subject: "cozy_mysteries" },
      { label: "Crime", subject: "crime" },
      { label: "Detective", subject: "detective_and_mystery_stories" },
      { label: "Psychological thriller", subject: "psychological_thriller" },
      { label: "Noir", subject: "noir" },
      { label: "Legal thriller", subject: "legal_thriller" },
    ],
  },
  {
    label: "Romance",
    subject: "romance",
    featured: true,
    description: "Love stories, slow burns, and hard-won happy endings.",
    subGenres: [
      { label: "Paranormal romance", subject: "paranormal_romance" },
      { label: "Fantasy romance", subject: "fantasy_romance" },
      { label: "Historical romance", subject: "historical_romance" },
      { label: "Contemporary romance", subject: "contemporary_romance" },
      { label: "Romantic suspense", subject: "romantic_suspense" },
      { label: "Romantic comedy", subject: "romantic_comedy" },
      { label: "Young adult romance", subject: "young_adult_romance" },
    ],
  },
  {
    label: "History",
    subject: "history",
    featured: true,
    description: "True accounts of the people and events that shaped us.",
    subGenres: [
      { label: "World history", subject: "world_history" },
      { label: "Ancient", subject: "ancient_history" },
      { label: "Medieval", subject: "medieval_history" },
      { label: "Military", subject: "military_history" },
      { label: "American", subject: "united_states_history" },
    ],
  },
  {
    label: "Philosophy",
    subject: "philosophy",
    featured: true,
    description: "Big questions about meaning, mind, and how to live.",
    subGenres: [
      { label: "Ethics", subject: "ethics" },
      { label: "Metaphysics", subject: "metaphysics" },
      { label: "Political philosophy", subject: "political_philosophy" },
      { label: "Eastern philosophy", subject: "eastern_philosophy" },
      { label: "Existentialism", subject: "existentialism" },
    ],
  },
  {
    label: "Biography",
    subject: "biography",
    featured: true,
    description: "The real lives of the remarkable and the ordinary.",
    subGenres: [
      { label: "Autobiography", subject: "autobiography" },
      { label: "Memoir", subject: "memoir" },
      { label: "Historical figures", subject: "historical_biography" },
    ],
  },
  {
    label: "Horror",
    subject: "horror",
    description: "Dread, the uncanny, and things that go bump in the dark.",
    subGenres: [
      { label: "Gothic", subject: "gothic_fiction" },
      { label: "Psychological", subject: "psychological_horror" },
      { label: "Supernatural", subject: "supernatural" },
      { label: "Occult", subject: "occult_fiction" },
    ],
  },
  { label: "Poetry", subject: "poetry", description: "Language at its most distilled and resonant." },
  {
    label: "Young Adult",
    subject: "young_adult",
    description: "Coming-of-age stories with heart and high stakes.",
    subGenres: [
      { label: "YA fantasy", subject: "young_adult_fantasy" },
      { label: "YA romance", subject: "young_adult_romance" },
      { label: "YA dystopian", subject: "young_adult_dystopian" },
      { label: "Coming of age", subject: "coming_of_age" },
    ],
  },
  {
    label: "Science",
    subject: "science",
    description: "How the universe works, from atoms to galaxies.",
    subGenres: [
      { label: "Physics", subject: "physics" },
      { label: "Biology", subject: "biology" },
      { label: "Chemistry", subject: "chemistry" },
      { label: "Astronomy", subject: "astronomy" },
      { label: "Mathematics", subject: "mathematics" },
    ],
  },
  {
    label: "Psychology",
    subject: "psychology",
    description: "The mind, behavior, and what makes us tick.",
    subGenres: [
      { label: "Cognitive", subject: "cognitive_psychology" },
      { label: "Social", subject: "social_psychology" },
      { label: "Behavioral", subject: "behavioral_psychology" },
      { label: "Self-help", subject: "self_help" },
    ],
  },
  {
    label: "Business",
    subject: "business",
    description: "Strategy, work, money, and building things that last.",
    subGenres: [
      { label: "Leadership", subject: "leadership" },
      { label: "Entrepreneurship", subject: "entrepreneurship" },
      { label: "Marketing", subject: "marketing" },
      { label: "Personal finance", subject: "personal_finance" },
      { label: "Economics", subject: "economics" },
    ],
  },
  {
    label: "Art",
    subject: "art",
    description: "Movements, makers, and the craft of seeing.",
    subGenres: [
      { label: "Art history", subject: "art_history" },
      { label: "Painting", subject: "painting" },
      { label: "Photography", subject: "photography" },
      { label: "Architecture", subject: "architecture" },
    ],
  },
  {
    label: "Travel",
    subject: "travel",
    description: "Journeys, places, and the world beyond your door.",
    subGenres: [
      { label: "Travel writing", subject: "travel_writing" },
      { label: "Adventure", subject: "adventure" },
    ],
  },
];

// Given a subject slug (parent or sub), return its parent Category if it's a
// sub-genre — used to render breadcrumbs and sibling chips on sub-genre pages.
export function parentCategory(subject: string): Category | undefined {
  return CATEGORIES.find((c) => c.subGenres?.some((s) => s.subject === subject));
}

// Shelves shown on the /browse landing page.
export const FEATURED_CATEGORIES = CATEGORIES.filter((c) => c.featured);

// Resolve a genre's display label from its subject slug, prettifying unknown
// subjects (e.g. "young_adult" → "Young Adult") so arbitrary genre pages render.
// Also checks sub-genre labels so "paranormal_romance" → "Paranormal romance"
// (the curated label) rather than the generic title-cased fallback.
export function categoryLabel(subject: string): string {
  const known = CATEGORIES.find((c) => c.subject === subject);
  if (known) return known.label;
  for (const c of CATEGORIES) {
    const sub = c.subGenres?.find((s) => s.subject === subject);
    if (sub) return sub.label;
  }
  return subject
    .split(/[_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// One-line blurb for a genre, with a sensible fallback for unknown subjects.
// Sub-genres inherit a softer "within Romance" description rather than echoing
// the parent's blurb verbatim.
export function categoryDescription(subject: string): string {
  const known = CATEGORIES.find((c) => c.subject === subject);
  if (known) return known.description;
  const parent = parentCategory(subject);
  if (parent) return `A corner of ${parent.label.toLowerCase()} — ${categoryLabel(subject).toLowerCase()} titles to explore.`;
  return `A shelf of ${categoryLabel(subject).toLowerCase()} titles to explore.`;
}

type OpenLibraryWork = {
  key: string;
  title?: string;
  author_name?: string[];
  authors?: { name?: string }[];
  cover_i?: number;
  cover_id?: number;
};

// OpenLibrary's subject feeds are a single global catalog and are frequently
// dominated by non-English editions — "romantic_comedy", for instance, is
// flooded with Japanese light novels. Athena leans toward English-reading
// users, so we drop works whose title is written in a CJK script (Han /
// Hiragana / Katakana / Hangul). Search-based shelves additionally pass
// `language:eng`; this filter is the backstop for the subjects endpoint, which
// has no language parameter.
const CJK_SCRIPT = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;
function looksEnglish(b: BookSearchResult): boolean {
  return !CJK_SCRIPT.test(b.title);
}

function fromOpenLibraryWork(w: OpenLibraryWork): BookSearchResult {
  const coverId = w.cover_id ?? w.cover_i;
  const authors =
    w.author_name ?? (w.authors ?? []).map((a) => a.name ?? "").filter(Boolean);
  return {
    externalId: `ol:${w.key}`,
    title: w.title ?? "Untitled",
    authors,
    coverUrl: coverId ? `${OPEN_LIBRARY_COVERS}/${coverId}-M.jpg` : undefined,
    genres: [],
  };
}

// Books people are picking up right now. Returns [] on any failure so the
// homepage degrades gracefully (the shelf simply doesn't render).
export async function getTrendingBooks(limit = 14): Promise<BookSearchResult[]> {
  try {
    const res = await catalogFetch(`${OPEN_LIBRARY_TRENDING}?limit=${limit * 2}`, 60 * 60 * 6);
    if (!res.ok) throw new Error(`Trending error: ${res.status}`);
    const data = (await res.json()) as { works?: OpenLibraryWork[] };
    return (data.works ?? [])
      .map(fromOpenLibraryWork)
      .filter((b) => b.coverUrl)
      .slice(0, limit);
  } catch (err) {
    console.warn("Trending books unavailable:", (err as Error).message);
    return [];
  }
}

// Recently published books, most-read first. Uses OpenLibrary search filtered
// to the last couple of years and sorted by readlog count, so the shelf shows
// new titles people are actually picking up (not obscure fresh catalog entries).
// Returns [] on failure so the page degrades gracefully.
export async function getNewReleases(limit = 14): Promise<BookSearchResult[]> {
  const year = new Date().getFullYear();
  try {
    const url = new URL(OPEN_LIBRARY);
    url.searchParams.set("q", `first_publish_year:[${year - 1} TO ${year + 1}]`);
    url.searchParams.set("sort", "readinglog");
    url.searchParams.set("limit", String(limit * 3));
    url.searchParams.set("fields", "key,title,subtitle,author_name,cover_i,first_publish_year,isbn");
    const res = await catalogFetch(url, 60 * 60 * 12);
    if (!res.ok) throw new Error(`New releases error: ${res.status}`);
    const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
    return (data.docs ?? [])
      .map(fromOpenLibrary)
      .filter((b) => b.coverUrl)
      .slice(0, limit);
  } catch (err) {
    console.warn("New releases unavailable:", (err as Error).message);
    return [];
  }
}

// A shelf of books for a single theme (see CATEGORIES).
export async function getBooksBySubject(subject: string, limit = 12): Promise<BookSearchResult[]> {
  const { books } = await getSubjectPage(subject, limit);
  return books;
}

// "Trending in <genre>" — books in this subject sorted by current readlog
// activity. We use the search endpoint (not /subjects/<x>.json?sort=...) because
// the subjects endpoint's sort param is unreliable — it returns an empty `works`
// array for some subjects (e.g. fantasy), which silently hid the whole shelf.
// search.json reliably honours `sort=readinglog` and lets us pin `language:eng`
// so the row leans toward English-reading users. Falls back to the plain subject
// feed (itself English-filtered) if the search call fails, so callers always get
// *something* rather than an empty row.
export async function getTrendingBySubject(
  subject: string,
  limit = 14,
): Promise<BookSearchResult[]> {
  try {
    const url = new URL(OPEN_LIBRARY);
    url.searchParams.set("q", `subject:${subject} AND language:eng`);
    url.searchParams.set("sort", "readinglog");
    url.searchParams.set("limit", String(limit * 2));
    url.searchParams.set("fields", "key,title,subtitle,author_name,cover_i,first_publish_year,isbn");
    const res = await catalogFetch(url, 60 * 60 * 6);
    if (!res.ok) throw new Error(`Trending subject error: ${res.status}`);
    const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
    const books = (data.docs ?? [])
      .map(fromOpenLibrary)
      .filter((b) => b.coverUrl)
      .filter(looksEnglish);
    if (books.length > 0) return books.slice(0, limit);
  } catch (err) {
    console.warn(`Trending in "${subject}" unavailable:`, (err as Error).message);
  }
  // Fallback: the default subject feed (already English-filtered) so the shelf
  // isn't empty when search is unreachable.
  const { books } = await getSubjectPage(subject, limit);
  return books;
}

// "New in <genre>" — recent titles within this subject. OpenLibrary's search
// supports a `subject:` clause plus a year range, sorted by readlog so the
// shelf shows fresh titles people are actually reading (not obscure new
// catalog entries with zero readers).
export async function getNewReleasesBySubject(
  subject: string,
  limit = 14,
): Promise<BookSearchResult[]> {
  const year = new Date().getFullYear();
  try {
    const url = new URL(OPEN_LIBRARY);
    url.searchParams.set(
      "q",
      `subject:${subject} AND language:eng AND first_publish_year:[${year - 2} TO ${year + 1}]`,
    );
    url.searchParams.set("sort", "readinglog");
    url.searchParams.set("limit", String(limit * 3));
    url.searchParams.set("fields", "key,title,subtitle,author_name,cover_i,first_publish_year,isbn");
    const res = await catalogFetch(url, 60 * 60 * 12);
    if (!res.ok) throw new Error(`New in subject error: ${res.status}`);
    const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
    return (data.docs ?? [])
      .map(fromOpenLibrary)
      .filter((b) => b.coverUrl)
      .filter(looksEnglish)
      .slice(0, limit);
  } catch (err) {
    console.warn(`New in "${subject}" unavailable:`, (err as Error).message);
    return [];
  }
}

// Books in a subject by a specific author. Used by the "By authors you've read"
// shelf — one search per author, capped tight so the per-genre dashboard
// doesn't fan out into dozens of slow requests.
export async function getBooksByAuthorInSubject(
  author: string,
  subject: string,
  limit = 6,
): Promise<BookSearchResult[]> {
  if (!author.trim()) return [];
  try {
    const url = new URL(OPEN_LIBRARY);
    url.searchParams.set("q", `author:"${author}" subject:${subject}`);
    url.searchParams.set("sort", "readinglog");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("fields", "key,title,subtitle,author_name,cover_i,first_publish_year,isbn");
    const res = await catalogFetch(url, 60 * 60 * 12);
    if (!res.ok) return [];
    const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
    return (data.docs ?? []).map(fromOpenLibrary).filter((b) => b.coverUrl);
  } catch {
    return [];
  }
}

export type SubjectPage = {
  books: BookSearchResult[];
  /** OpenLibrary's total work_count for the subject (unfiltered). */
  total: number;
  /**
   * Whether the lookup actually reached OpenLibrary. `false` means the request
   * failed (network / rate limit), so an empty result is inconclusive — callers
   * should retry rather than treat the genre as nonexistent.
   */
  ok: boolean;
  /**
   * The raw OpenLibrary offset to resume from on the next page. Because we drop
   * cover-less and non-English works, this advances by however many *raw* works
   * we consumed to fill the page — not by `books.length` — so "Load more" never
   * skips or repeats titles.
   */
  nextOffset: number;
  /** Whether more raw works remain past `nextOffset`. */
  hasMore: boolean;
};

// One raw batch from the subjects endpoint, with the retry behaviour OpenLibrary
// demands (it readily rate-limits bursts — the /browse page alone fires ~10
// subject requests at once). Returns ok:false on exhausted retries so the caller
// can distinguish a transient failure from a genuinely empty page.
async function fetchSubjectBatch(
  subject: string,
  limit: number,
  offset: number,
): Promise<{ works: OpenLibraryWork[]; total: number; ok: boolean }> {
  const url = `${OPEN_LIBRARY_SUBJECT}/${subject}.json?limit=${limit}&offset=${offset}`;
  const delays = [300, 800];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const res = await catalogFetch(url, 60 * 60 * 24);
      if (!res.ok) throw new Error(`Subject error: ${res.status}`);
      const data = (await res.json()) as { works?: OpenLibraryWork[]; work_count?: number };
      return { works: data.works ?? [], total: data.work_count ?? 0, ok: true };
    } catch (err) {
      if (attempt === delays.length) {
        console.warn(`Subject "${subject}" unavailable:`, (err as Error).message);
        return { works: [], total: 0, ok: false };
      }
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  return { works: [], total: 0, ok: false };
}

// A paginated page of books for a genre, used by the /browse/[subject] page and
// its "Load more" control. We drop cover-less and non-English works for a
// cleaner, English-leaning grid — which can thin a raw 24-work page down to a
// handful (romantic_comedy is mostly Japanese light novels on OpenLibrary). To
// still return a full page, we over-fetch in a bounded loop until we've gathered
// `limit` keepers (or run out of catalog / batches), and report the raw offset
// we actually consumed so the next page resumes cleanly.
export async function getSubjectPage(
  subject: string,
  limit = 24,
  offset = 0,
): Promise<SubjectPage> {
  const collected: BookSearchResult[] = [];
  const BATCH = limit * 2; // raw works per request — over-fetch to absorb filtering
  const MAX_BATCHES = 4; // cap fan-out so a sparse genre can't loop forever
  let rawOffset = offset;
  let total = 0;
  let reached = false;

  for (let batch = 0; batch < MAX_BATCHES && collected.length < limit; batch++) {
    const page = await fetchSubjectBatch(subject, BATCH, rawOffset);
    if (!page.ok) {
      // Transient failure. If we already have something, return it; otherwise
      // signal ok:false so the caller can retry rather than 404 the genre.
      if (collected.length === 0) {
        return { books: [], total: 0, ok: false, nextOffset: rawOffset, hasMore: true };
      }
      break;
    }
    reached = true;
    total = page.total;
    if (page.works.length === 0) break; // exhausted the catalog

    for (const w of page.works) {
      rawOffset++;
      const b = fromOpenLibraryWork(w);
      if (b.coverUrl && looksEnglish(b)) collected.push(b);
      if (collected.length >= limit) break;
    }

    if (rawOffset >= total) break; // no raw works left
    if (page.works.length < BATCH) break; // short page → catalog exhausted
  }

  return {
    books: collected.slice(0, limit),
    total,
    ok: reached,
    nextOffset: rawOffset,
    hasMore: reached ? rawOffset < total : true,
  };
}

// OpenLibrary descriptions are wiki-style and frequently end with SEO spam
// injected by random editors: piracy links, "Download free pdf" lines,
// affiliate URLs, "Read online" callouts, etc. Strip those before display so
// readers see the actual summary and nothing else.
const SPAM_TOKENS =
  /\b(pdf|epub|mobi|kindle|audiobook|download|read online|free book|full book|torrent|ebook|isbn[- ]?\d|buy now)\b/i;

export function cleanDescription(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  let text = raw;

  // 1. Drop markdown reference definitions ("[1]: https://en.wikipedia.org/...")
  //    that OpenLibrary editors paste at the end of summaries as Wikipedia
  //    citations. These leave dangling `[1]` markers in the visible body, so
  //    they're handled in step 3.
  text = text.replace(/^[ \t]*\[[^\]]+\]:[ \t]*\S.*$/gm, "");

  // 2. Drop inline markdown links whose visible text or URL screams spam
  //    (piracy / "Download PDF"). Keep benign inline links by collapsing them
  //    to just the visible text.
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
    if (SPAM_TOKENS.test(label) || SPAM_TOKENS.test(url)) return "";
    return label;
  });

  // 3. Drop markdown reference-style links: `[text][id]`. These are usually
  //    citation pointers ("[Wikipedia][1]") whose footnote was stripped in
  //    step 1, so the bracketed label adds nothing — drop the whole thing.
  //    Also clean up surrounding parens, e.g. "( [Wikipedia][1] )" → "".
  text = text.replace(/\(\s*\[([^\]]+)\]\[[^\]]+\]\s*\)/g, "");
  text = text.replace(/\[([^\]]+)\]\[[^\]]+\]/g, "");

  // 4. Drop orphan footnote markers left behind on their own line ("[1]").
  text = text.replace(/^[ \t]*\[\d+\][ \t]*$/gm, "");

  // 5. Drop bare "(Source: ...)" / "(Wikipedia)" attribution tails.
  text = text.replace(/\(\s*(source|wikipedia|via)[^)]*\)/gi, "");

  // 6. Drop the OpenLibrary "---" separator before publisher boilerplate.
  text = text.replace(/\n-{3,}[\s\S]*$/, "");

  // 7. Strip lines that are mostly a URL, or that combine spam keywords + URL.
  text = text
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^https?:\/\/\S+\s*$/i.test(trimmed)) return false;
      if (SPAM_TOKENS.test(trimmed) && /https?:\/\//i.test(trimmed)) return false;
      return true;
    })
    .join("\n");

  // 8. Strip bare URLs left over in mid-sentence.
  text = text.replace(/https?:\/\/\S+/g, "").trim();

  // 9. Collapse runs of blank lines and trailing punctuation orphans.
  text = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[\s,;:()-]+$/g, "")
    .trim();

  return text || undefined;
}

// --- Single-book lookup by external id -----------------------------------
// Powers the /books/external/[...externalId] detail page (search results and
// shelf covers that aren't in our DB yet). Returns null when the book can't be
// found so the page can render a 404 instead of throwing.

export async function getBookByExternalId(externalId: string): Promise<BookSearchResult | null> {
  if (externalId.startsWith("ol:")) {
    return getOpenLibraryWork(externalId.slice(3));
  }
  return getGoogleVolume(externalId);
}

type OpenLibraryWorkDetail = {
  title?: string;
  description?: string | { value?: string };
  covers?: number[];
  subjects?: string[];
  authors?: { author?: { key?: string } }[];
};

async function getOpenLibraryWork(key: string): Promise<BookSearchResult | null> {
  // Retry once on transient failure. OL is the only catalog we hit for this
  // lookup, so if we 404 here the page 404s — be forgiving, not strict.
  const delays = [0, 600, 1500];
  let w: OpenLibraryWorkDetail | null = null;
  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      const res = await catalogFetch(`https://openlibrary.org${key}.json`, 60 * 60 * 24, 12000);
      if (!res.ok) {
        if (res.status === 404) return null; // genuinely doesn't exist; don't retry
        continue;
      }
      w = (await res.json()) as OpenLibraryWorkDetail;
      break;
    } catch {
      // Network / abort — fall through to next retry
    }
  }
  if (!w) return null;
  try {
    let description = cleanDescription(
      typeof w.description === "string" ? w.description : w.description?.value,
    );
    let coverId = Array.isArray(w.covers) ? w.covers.find((c) => c > 0) : undefined;
    const authorKeys = (w.authors ?? [])
      .map((a) => a.author?.key)
      .filter((k): k is string => Boolean(k))
      .slice(0, 5);

    // OpenLibrary stores descriptions and many covers on individual editions,
    // not the work itself. Fall back to the first edition that has whichever
    // field we're still missing so detail pages don't render half-empty.
    let isbn13: string | undefined;
    let pageCount: number | undefined;
    let publishedYear: number | undefined;
    if (!coverId || !description) {
      const ed = await getFirstUsefulEdition(key);
      if (ed) {
        if (!coverId && ed.coverId) coverId = ed.coverId;
        if (!description && ed.description) description = ed.description;
        isbn13 = ed.isbn13;
        pageCount = ed.pageCount;
        publishedYear = ed.publishedYear;
      }
    }

    const [authors, rating] = await Promise.all([
      Promise.all(authorKeys.map(getOpenLibraryAuthorName)).then((names) => names.filter(Boolean)),
      getOpenLibraryRating(key),
    ]);
    return {
      externalId: `ol:${key}`,
      title: w.title ?? "Untitled",
      authors,
      description,
      coverUrl: coverId ? `${OPEN_LIBRARY_COVERS}/${coverId}-L.jpg` : undefined,
      genres: (w.subjects ?? []).slice(0, 6),
      averageRating: rating.average,
      ratingsCount: rating.count,
      isbn13,
      pageCount,
      publishedYear,
    };
  } catch (err) {
    console.warn("OpenLibrary work lookup failed:", (err as Error).message);
    return null;
  }
}

type OpenLibraryEdition = {
  covers?: number[];
  description?: string | { value?: string };
  isbn_13?: string[];
  number_of_pages?: number;
  publish_date?: string;
};

// Walk through a work's editions and pluck the first one with usable metadata.
// We cap the scan because some works have hundreds of editions, but the most
// recent few usually carry the same cover and description as the rest.
async function getFirstUsefulEdition(workKey: string): Promise<{
  coverId?: number;
  description?: string;
  isbn13?: string;
  pageCount?: number;
  publishedYear?: number;
} | null> {
  try {
    const res = await catalogFetch(
      `https://openlibrary.org${workKey}/editions.json?limit=20`,
      60 * 60 * 24,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { entries?: OpenLibraryEdition[] };
    const entries = data.entries ?? [];

    let coverId: number | undefined;
    let description: string | undefined;
    let isbn13: string | undefined;
    let pageCount: number | undefined;
    let publishedYear: number | undefined;

    for (const e of entries) {
      if (!coverId) {
        coverId = (e.covers ?? []).find((c) => c > 0);
      }
      if (!description) {
        const raw = typeof e.description === "string" ? e.description : e.description?.value;
        const d = cleanDescription(raw);
        if (d) description = d;
      }
      if (!isbn13) isbn13 = e.isbn_13?.[0];
      if (!pageCount && e.number_of_pages) pageCount = e.number_of_pages;
      if (!publishedYear && e.publish_date) {
        const m = e.publish_date.match(/\d{4}/);
        if (m) publishedYear = Number(m[0]);
      }
      if (coverId && description && isbn13 && pageCount && publishedYear) break;
    }
    return { coverId, description, isbn13, pageCount, publishedYear };
  } catch {
    return null;
  }
}

// OpenLibrary keeps community ratings on a separate endpoint, keyed by work.
// Returns empty values (not an error) when a work has no ratings yet.
async function getOpenLibraryRating(
  key: string,
): Promise<{ average?: number; count?: number }> {
  try {
    const res = await catalogFetch(`https://openlibrary.org${key}/ratings.json`, 60 * 60 * 24);
    if (!res.ok) return {};
    const data = (await res.json()) as { summary?: { average?: number; count?: number } };
    return { average: data.summary?.average ?? undefined, count: data.summary?.count ?? undefined };
  } catch {
    return {};
  }
}

async function getOpenLibraryAuthorName(key: string): Promise<string> {
  try {
    const res = await catalogFetch(`https://openlibrary.org${key}.json`, 60 * 60 * 24);
    if (!res.ok) return "";
    const a = (await res.json()) as { name?: string };
    return a.name ?? "";
  } catch {
    return "";
  }
}

async function getGoogleVolume(id: string): Promise<BookSearchResult | null> {
  const url = new URL(`${GOOGLE_BOOKS}/${id}`);
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }
  const delays = [0, 600, 1500];
  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      const res = await catalogFetch(url, 60 * 60 * 24, 12000);
      if (!res.ok) {
        if (res.status === 404) return null;
        continue;
      }
      const v = (await res.json()) as GoogleVolume;
      return toBook(v);
    } catch {
      // Network / abort — retry
    }
  }
  console.warn("Google volume lookup failed after retries:", id);
  return null;
}

function toBook(v: GoogleVolume): BookSearchResult {
  const info = v.volumeInfo ?? {};
  const isbn13 = info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier;
  const year = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : undefined;
  return {
    externalId: v.id,
    title: info.title ?? "Untitled",
    subtitle: info.subtitle,
    authors: info.authors ?? [],
    description: cleanDescription(info.description),
    coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://"),
    pageCount: info.pageCount,
    publishedYear: Number.isFinite(year) ? year : undefined,
    isbn13,
    genres: info.categories ?? [],
    averageRating: info.averageRating,
    ratingsCount: info.ratingsCount,
  };
}
