import { createHash } from "node:crypto";

export type ImportReadingStatus = "WANT_TO_READ" | "READING" | "FINISHED" | "DNF";

export type GoodreadsImportBook = {
  externalId: string;
  isbn13?: string;
  title: string;
  authors: string[];
  pageCount?: number;
  publishedYear?: number;
};

export type GoodreadsImportEntry = {
  book: GoodreadsImportBook;
  status: ImportReadingStatus;
  rating: number | null;
  customShelves: string[];
  startedAt?: Date;
  finishedAt?: Date;
  privateNote?: string;
};

export type GoodreadsImportSummary = {
  rows: number;
  imported: number;
  skipped: number;
  notes: number;
  customShelves: number;
  byStatus: Record<ImportReadingStatus, number>;
};

const STATUSES: ImportReadingStatus[] = ["WANT_TO_READ", "READING", "FINISHED", "DNF"];
const MAX_ROWS = 1500;

export function parseGoodreadsCsv(csv: string): GoodreadsImportEntry[] {
  const table = parseCsv(csv.replace(/^\uFEFF/, ""));
  if (table.length < 2) return [];

  const headers = table[0].map(normalizeHeader);
  const rows = table.slice(1, MAX_ROWS + 1);
  const entries: GoodreadsImportEntry[] = [];

  for (const row of rows) {
    const get = (name: string) => row[headers.indexOf(normalizeHeader(name))]?.trim() ?? "";
    const title = get("Title");
    if (!title) continue;

    const authors = [
      get("Author"),
      ...get("Additional Authors")
        .split(",")
        .map((author) => author.trim()),
    ].filter(Boolean);
    const isbn13 = cleanIsbn(get("ISBN13")) ?? cleanIsbn(get("ISBN"));
    const rating = parseRating(get("My Rating"));
    const shelves = get("Bookshelves");
    const status = mapStatus(get("Exclusive Shelf"), shelves);
    const dateRead = parseGoodreadsDate(get("Date Read"));
    const dateAdded = parseGoodreadsDate(get("Date Added"));
    const privateNote = get("Private Notes") || undefined;

    entries.push({
      book: {
        externalId: stableImportId(title, authors, isbn13),
        ...(isbn13 ? { isbn13 } : {}),
        title,
        authors,
        pageCount: parsePositiveInt(get("Number of Pages")),
        publishedYear:
          parsePositiveInt(get("Original Publication Year")) ?? parsePositiveInt(get("Year Published")),
      },
      status,
      rating,
      customShelves: parseCustomShelves(shelves),
      ...(status === "READING" && dateAdded ? { startedAt: dateAdded } : {}),
      ...(status === "FINISHED" && dateRead ? { finishedAt: dateRead } : {}),
      ...(privateNote ? { privateNote } : {}),
    });
  }

  return entries;
}

export function summarizeGoodreadsImport(entries: GoodreadsImportEntry[], sourceRowCount = entries.length): GoodreadsImportSummary {
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<ImportReadingStatus, number>;
  for (const entry of entries) byStatus[entry.status] += 1;
  const customShelves = new Set(entries.flatMap((entry) => entry.customShelves));

  return {
    rows: sourceRowCount,
    imported: entries.length,
    skipped: Math.max(0, sourceRowCount - entries.length),
    notes: entries.filter((entry) => entry.privateNote).length,
    customShelves: customShelves.size,
    byStatus,
  };
}

export function countGoodreadsDataRows(csv: string): number {
  return Math.max(0, parseCsv(csv.replace(/^\uFEFF/, "")).length - 1);
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function cleanIsbn(value: string) {
  const cleaned = value.replace(/^="?|"?$/g, "").replace(/[^0-9X]/gi, "");
  if (cleaned.length === 13 || cleaned.length === 10) return cleaned.toUpperCase();
  return undefined;
}

function parseRating(value: string) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function parsePositiveInt(value: string) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function parseGoodreadsDate(value: string) {
  if (!value) return undefined;
  const normalized = value.replace(/-/g, "/");
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function mapStatus(exclusiveShelf: string, shelves: string): ImportReadingStatus {
  const allShelves = `${exclusiveShelf},${shelves}`.toLowerCase();
  if (/(^|,|\s)(dnf|did-not-finish|abandoned)(,|\s|$)/.test(allShelves)) return "DNF";
  switch (exclusiveShelf.toLowerCase()) {
    case "read":
      return "FINISHED";
    case "currently-reading":
      return "READING";
    case "to-read":
      return "WANT_TO_READ";
    default:
      return "WANT_TO_READ";
  }
}

function parseCustomShelves(shelves: string) {
  const systemShelves = new Set(["read", "currently-reading", "to-read", "dnf", "did-not-finish", "abandoned"]);
  return [
    ...new Set(
      shelves
        .split(",")
        .map((shelf) => shelf.trim())
        .filter((shelf) => shelf && !systemShelves.has(shelf.toLowerCase())),
    ),
  ];
}

function stableImportId(title: string, authors: string[], isbn?: string) {
  if (isbn) return `goodreads:isbn:${isbn}`;
  const key = `${title}\n${authors.join(",")}`.toLowerCase();
  const hash = createHash("sha1").update(key).digest("hex").slice(0, 16);
  return `goodreads:${hash}`;
}
