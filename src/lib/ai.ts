// Athena AI — provider-agnostic, free-tier-first.
// Priority: GEMINI_API_KEY > GROQ_API_KEY > OPENAI_API_KEY > offline stub.
// All three providers ship a usable free tier; Gemini is the easiest to start with.

export type RecommendInput = {
  prompt: string;
  recentBooks: {
    title: string;
    authors: string[];
    genres?: string[];
    status?: string;
    rating?: number;
  }[];
};

export type Recommendation = {
  title: string;
  author: string;
  reason: string;
};

const SYSTEM = `You are Athena, a thoughtful AI librarian.
Given a user's natural-language request and their recent reading history,
recommend 5 books. Respond in JSON: { "recommendations": [{ "title", "author", "reason" }] }.
Be specific, avoid the obvious bestsellers unless explicitly asked, and tailor reasoning
to the user's history.`;

const STUB_RECS: Recommendation[] = [
  { title: "Stoner", author: "John Williams", reason: "Quiet, philosophical, exactly the mood you described." },
  { title: "The Sense of an Ending", author: "Julian Barnes", reason: "Short, melancholic, masterfully written." },
  { title: "Klara and the Sun", author: "Kazuo Ishiguro", reason: "Gentle but unsettling — fits your recent reads." },
  { title: "Convenience Store Woman", author: "Sayaka Murata", reason: "Under 200 pages, strange, lingers." },
  { title: "The Hearing Trumpet", author: "Leonora Carrington", reason: "Unexpected pick if you want something stranger." },
];

export async function recommendBooks(input: RecommendInput): Promise<Recommendation[]> {
  const history = input.recentBooks.length
    ? input.recentBooks
        .map((b) => {
          const meta = [
            b.status ? b.status.toLowerCase().replace(/_/g, " ") : null,
            b.rating ? `rated ${b.rating}/5` : null,
            b.genres?.length ? b.genres.slice(0, 3).join(", ") : null,
          ]
            .filter(Boolean)
            .join("; ");
          return `- ${b.title} by ${b.authors.join(", ")}${meta ? ` (${meta})` : ""}`;
        })
        .join("\n")
    : "(no reading history provided)";

  const userMsg = `Request: ${input.prompt}\n\nThe reader's library:\n${history}\n\nUse this history to tailor and justify your picks; you may also recommend a book from this library if it fits the request, noting they've already read it.`;

  const providers: { name: string; enabled: boolean; call: () => Promise<{ recommendations?: Recommendation[] }> }[] = [
    { name: "gemini", enabled: !!process.env.GEMINI_API_KEY, call: () => geminiJson(SYSTEM, userMsg) },
    { name: "groq", enabled: !!process.env.GROQ_API_KEY, call: () => groqJson(SYSTEM, userMsg) },
    { name: "openai", enabled: !!process.env.OPENAI_API_KEY, call: () => openaiJson(SYSTEM, userMsg) },
  ];

  for (const p of providers) {
    if (!p.enabled) continue;
    try {
      const result = await p.call();
      if (result.recommendations?.length) return result.recommendations;
    } catch (err) {
      console.warn(`[ai] ${p.name} failed, falling through:`, (err as Error).message.slice(0, 200));
    }
  }
  return STUB_RECS;
}

export async function summarizeReading(
  book: { title: string; authors: string[] },
  notes: string[],
): Promise<string> {
  const system = "You write short, evocative reading-memory summaries (3–5 sentences) from a user's notes.";
  const user = `Book: ${book.title} by ${book.authors.join(", ")}\n\nNotes:\n${notes.join("\n---\n")}`;

  const providers: { name: string; enabled: boolean; call: () => Promise<string> }[] = [
    { name: "gemini", enabled: !!process.env.GEMINI_API_KEY, call: () => geminiText(system, user) },
    { name: "groq", enabled: !!process.env.GROQ_API_KEY, call: () => groqText(system, user) },
    { name: "openai", enabled: !!process.env.OPENAI_API_KEY, call: () => openaiText(system, user) },
  ];

  for (const p of providers) {
    if (!p.enabled) continue;
    try {
      const text = await p.call();
      if (text) return text;
    } catch (err) {
      console.warn(`[ai] ${p.name} failed, falling through:`, (err as Error).message.slice(0, 200));
    }
  }

  return `You finished ${book.title} by ${book.authors.join(", ")}. ${
    notes.length
      ? `You wrote ${notes.length} notes — the themes you returned to most were memory, longing, and small acts of care.`
      : "Add notes while reading to unlock your reading memory."
  }`;
}

export type ReaderPersonality = { type: string; summary: string };

const PERSONALITY_SYSTEM = `You are Athena, a perceptive literary critic with a warm voice.
Given a reader's library, do two things:
1. Name their "reader type" in 2–4 evocative words, like a personality archetype
   (e.g. "The Melancholy Wanderer", "Restless Polymath", "Comfort-Seeking Romantic").
2. Write a specific, flattering-but-honest 3–4 sentence taste profile: the themes and
   moods they gravitate to, what their choices suggest about them, and one gentle,
   playful observation about a blind spot or an adventure they might enjoy next.
Be specific to THIS library — reference genres/authors when you can. Avoid generic filler.
Respond in JSON: { "type": "...", "summary": "..." }.`;

// Analyze a reader's library into a named "reader type" + taste profile.
export async function readingPersonality(
  books: { title: string; authors: string[]; genres?: string[]; rating?: number; status?: string }[],
): Promise<ReaderPersonality> {
  const list = books
    .map((b) => {
      const meta = [
        b.rating ? `rated ${b.rating}/5` : null,
        b.genres?.length ? b.genres.slice(0, 3).join(", ") : null,
      ]
        .filter(Boolean)
        .join("; ");
      return `- ${b.title} by ${b.authors.join(", ")}${meta ? ` (${meta})` : ""}`;
    })
    .join("\n");
  const user = `The reader's library (${books.length} books):\n${list}`;

  const providers: { name: string; enabled: boolean; call: () => Promise<ReaderPersonality> }[] = [
    { name: "gemini", enabled: !!process.env.GEMINI_API_KEY, call: () => geminiJson(PERSONALITY_SYSTEM, user) },
    { name: "groq", enabled: !!process.env.GROQ_API_KEY, call: () => groqJson(PERSONALITY_SYSTEM, user) },
    { name: "openai", enabled: !!process.env.OPENAI_API_KEY, call: () => openaiJson(PERSONALITY_SYSTEM, user) },
  ];

  for (const p of providers) {
    if (!p.enabled) continue;
    try {
      const result = await p.call();
      if (result?.type && result?.summary) return result;
    } catch (err) {
      console.warn(`[ai] ${p.name} personality failed, falling through:`, (err as Error).message.slice(0, 200));
    }
  }

  // Offline stub so the feature still returns something coherent.
  return {
    type: "The Curious Reader",
    summary:
      "Your shelves show a reader who follows curiosity wherever it leads — a little of everything, chosen by mood rather than category. Add more books and ratings and Athena will read your tastes more sharply.",
  };
}

// ─────────────────────────────────────────────────────────────
// Gemini — free tier at aistudio.google.com/apikey
// ─────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.0-flash";

async function geminiCall(system: string, user: string, json: boolean): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: json ? { responseMimeType: "application/json" } : {},
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function geminiJson<T>(system: string, user: string): Promise<T> {
  return JSON.parse((await geminiCall(system, user, true)) || "{}") as T;
}
async function geminiText(system: string, user: string): Promise<string> {
  return (await geminiCall(system, user, false)).trim();
}

// ─────────────────────────────────────────────────────────────
// Groq — free tier at console.groq.com (very fast Llama 3.x)
// ─────────────────────────────────────────────────────────────

const GROQ_MODEL = "llama-3.3-70b-versatile";

async function groqCall(system: string, user: string, json: boolean): Promise<string> {
  const key = process.env.GROQ_API_KEY!;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

async function groqJson<T>(system: string, user: string): Promise<T> {
  return JSON.parse((await groqCall(system, user, true)) || "{}") as T;
}
async function groqText(system: string, user: string): Promise<string> {
  return (await groqCall(system, user, false)).trim();
}

// ─────────────────────────────────────────────────────────────
// OpenAI — paid, kept here so the path is open if you ever want it
// ─────────────────────────────────────────────────────────────

async function openaiCall(system: string, user: string, json: boolean): Promise<string> {
  const key = process.env.OPENAI_API_KEY!;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

async function openaiJson<T>(system: string, user: string): Promise<T> {
  return JSON.parse((await openaiCall(system, user, true)) || "{}") as T;
}
async function openaiText(system: string, user: string): Promise<string> {
  return (await openaiCall(system, user, false)).trim();
}
