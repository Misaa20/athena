"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Trash2, Pencil, Check, X, BookmarkPlus } from "lucide-react";
import { BookCard } from "@/components/book-card";
import { authedFetch } from "@/lib/client";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

type ShelfEntry = {
  book: { id: string; title: string; authors: string[]; coverUrl: string | null };
};

type Shelf = {
  id: string;
  name: string;
  isPublic: boolean;
  _count: { entries: number };
  entries: ShelfEntry[];
};

// User-managed shelves on top of the default WANT/READING/FINISHED/DNF lists.
// Lives inside the library page. Self-fetches; safe to drop into any client area.
export function MyShelves() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authedFetch<{ shelves: Shelf[] }>("/api/me/shelves");
      setShelves(data.shelves ?? []);
    } catch {
      setShelves([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createShelf(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await authedFetch("/api/me/shelves", {
        method: "POST",
        body: JSON.stringify({ name, isPublic: newIsPublic }),
      });
      setNewName("");
      setNewIsPublic(true);
      setCreating(false);
      toast.push("success", `Created shelf "${name}"`);
      load();
    } catch (err) {
      const msg = (err as Error).message;
      toast.push("error", msg.includes("name_taken") ? "You already have a shelf with that name." : "Couldn't create shelf.");
    }
  }

  async function deleteShelf(shelf: Shelf) {
    if (!confirm(`Delete "${shelf.name}"? Books on the shelf stay in your library.`)) return;
    try {
      await authedFetch(`/api/me/shelves/${shelf.id}`, { method: "DELETE" });
      toast.push("success", `Deleted "${shelf.name}"`);
      setShelves((s) => s.filter((x) => x.id !== shelf.id));
    } catch {
      toast.push("error", "Couldn't delete shelf.");
    }
  }

  async function togglePublic(shelf: Shelf) {
    try {
      await authedFetch(`/api/me/shelves/${shelf.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublic: !shelf.isPublic }),
      });
      setShelves((s) =>
        s.map((x) => (x.id === shelf.id ? { ...x, isPublic: !shelf.isPublic } : x)),
      );
    } catch {
      toast.push("error", "Couldn't update visibility.");
    }
  }

  async function rename(shelf: Shelf, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === shelf.name) return;
    try {
      await authedFetch(`/api/me/shelves/${shelf.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      setShelves((s) => s.map((x) => (x.id === shelf.id ? { ...x, name: trimmed } : x)));
      toast.push("success", "Renamed.");
    } catch (err) {
      const msg = (err as Error).message;
      toast.push("error", msg.includes("name_taken") ? "Name already used." : "Couldn't rename.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-ink-900">My shelves</h2>
          <p className="text-sm text-ink-900/55">
            Build collections that aren&apos;t just &quot;to-read&quot; or &quot;finished&quot;.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-ink-100/40 px-3 py-1.5 text-sm text-ink-900 transition hover:border-accent/50 hover:text-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            New shelf
          </button>
        )}
      </div>

      {creating && (
        <form
          onSubmit={createShelf}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-ink-100/40 p-3 shadow-glow"
        >
          <BookmarkPlus className="h-4 w-4 shrink-0 text-accent" />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Shelf name (e.g. Comfort reads)"
            maxLength={60}
            className="flex-1 min-w-[12rem] bg-transparent text-sm text-ink-900 placeholder:text-ink-900/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setNewIsPublic((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition",
              newIsPublic
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-ink-200 text-ink-900/65 hover:border-accent/40",
            )}
            title="Toggle visibility"
          >
            {newIsPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {newIsPublic ? "Public" : "Private"}
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1 text-sm text-ink-50 transition hover:bg-accent-dark"
          >
            <Check className="h-3.5 w-3.5" /> Create
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-ink-900/60 transition hover:bg-ink-100"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-900/50">Loading shelves…</p>
      ) : shelves.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-100/30 p-6 text-center">
          <BookmarkPlus className="mx-auto h-5 w-5 text-accent/60" />
          <p className="mt-2 text-sm text-ink-900/70">No shelves yet.</p>
          <p className="mt-1 text-xs text-ink-900/45">
            Create one like &quot;Comfort reads&quot;, &quot;Read in 2026&quot;, or
            &quot;Book club picks&quot;.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shelves.map((s) => (
            <ShelfCard
              key={s.id}
              shelf={s}
              onDelete={() => deleteShelf(s)}
              onTogglePublic={() => togglePublic(s)}
              onRename={(name) => rename(s, name)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ShelfCard({
  shelf,
  onDelete,
  onTogglePublic,
  onRename,
}: {
  shelf: Shelf;
  onDelete: () => void;
  onTogglePublic: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(shelf.name);
  const previews = shelf.entries.slice(0, 4);

  return (
    <div className="group rounded-xl border border-ink-200 bg-ink-100/40 p-4 transition hover:border-accent/30 hover:shadow-glow">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onRename(draft);
                setEditing(false);
              }}
              className="flex items-center gap-1"
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={60}
                className="flex-1 rounded-md border border-accent/40 bg-ink-50 px-2 py-1 font-serif text-base text-ink-900 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button type="submit" className="rounded-md p-1 text-accent hover:bg-ink-100">
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(shelf.name);
                }}
                className="rounded-md p-1 text-ink-900/50 hover:bg-ink-100"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <h3 className="font-serif text-lg text-ink-900">{shelf.name}</h3>
          )}
          <p className="mt-0.5 text-xs text-ink-900/55">
            {shelf._count.entries} {shelf._count.entries === 1 ? "book" : "books"}
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={onTogglePublic}
            title={shelf.isPublic ? "Public — visible on profile" : "Private"}
            className="rounded-md p-1.5 text-ink-900/60 transition hover:bg-ink-200/40 hover:text-ink-900"
          >
            {shelf.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setEditing(true)}
            title="Rename"
            className="rounded-md p-1.5 text-ink-900/60 transition hover:bg-ink-200/40 hover:text-ink-900"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete shelf"
            className="rounded-md p-1.5 text-ink-900/60 transition hover:bg-ink-200/40 hover:text-wine"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
          shelf.isPublic
            ? "bg-accent/10 text-accent"
            : "bg-ink-200/40 text-ink-900/55",
        )}
      >
        {shelf.isPublic ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
        {shelf.isPublic ? "Public" : "Private"}
      </span>

      {previews.length > 0 ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {previews.map((e) => (
            <BookCard
              key={e.book.id}
              id={e.book.id}
              title={e.book.title}
              authors={e.book.authors}
              coverUrl={e.book.coverUrl}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-ink-900/40">
          Empty. Open a book and add it to this shelf.
        </p>
      )}
    </div>
  );
}
