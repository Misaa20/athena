"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Compass, Sparkles, Users, Library, LayoutDashboard, Quote, Hash, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/books";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Pages" | "Browse" | "Search";
};

const PAGES: Item[] = [
  { id: "p:dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Pages" },
  { id: "p:library", label: "My Library", href: "/library", icon: Library, group: "Pages" },
  { id: "p:browse", label: "Browse books", href: "/browse", icon: Compass, group: "Pages" },
  { id: "p:librarian", label: "Ask the Librarian", hint: "AI recommendations", href: "/librarian", icon: Sparkles, group: "Pages" },
  { id: "p:people", label: "Readers", href: "/people", icon: Users, group: "Pages" },
  { id: "p:quotes", label: "My quotes wall", href: "/quotes", icon: Quote, group: "Pages" },
];

const GENRES: Item[] = CATEGORIES.map((c) => ({
  id: `g:${c.subject}`,
  label: c.label,
  hint: "Genre",
  href: `/browse/${c.subject}`,
  icon: Hash,
  group: "Browse",
}));

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd/Ctrl+K to toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base: Item[] = [...PAGES, ...GENRES];
    const filtered = q
      ? base.filter((i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q))
      : base;

    // If there's a query, prepend a "search for X" item that hits /library?q=
    if (q) {
      return [
        {
          id: "search:books",
          label: `Search books for "${query}"`,
          hint: "Find a book",
          href: `/library?q=${encodeURIComponent(query)}`,
          icon: Search,
          group: "Search",
        },
        ...filtered,
      ];
    }
    return filtered;
  }, [query]);

  function go(item: Item) {
    router.push(item.href);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[active];
      if (it) go(it);
    }
  }

  // Group items for rendering.
  const grouped = useMemo(() => {
    const map = new Map<string, { item: Item; index: number }[]>();
    items.forEach((item, index) => {
      const arr = map.get(item.group) ?? [];
      arr.push({ item, index });
      map.set(item.group, arr);
    });
    return Array.from(map.entries());
  }, [items]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 items-center gap-2 rounded-md border border-ink-200 bg-ink-100/40 px-3 text-sm text-ink-900/60 transition hover:border-accent/40 hover:text-ink-900 md:inline-flex"
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <span className="ml-2 flex items-center gap-1 rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] text-ink-900/50">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-ink-50/70 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-label="Command palette"
            className="relative z-10 w-[92%] max-w-xl overflow-hidden rounded-xl border border-ink-200 bg-ink-100/95 shadow-glow-lg animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3">
              <Search className="h-4 w-4 text-accent" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Jump to a page, genre, or search books…"
                className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-900/40 focus:outline-none"
              />
              <kbd className="hidden rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] text-ink-900/50 md:inline">esc</kbd>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {items.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-ink-900/50">Nothing matches.</p>
              )}
              {grouped.map(([group, arr]) => (
                <div key={group} className="px-1 py-1">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-ink-900/40">
                    {group}
                  </p>
                  {arr.map(({ item, index }) => {
                    const Icon = item.icon;
                    const isActive = index === active;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(item)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition",
                          isActive ? "bg-ink-200/60 text-ink-950" : "text-ink-900/80 hover:bg-ink-200/30",
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isActive ? "text-accent" : "text-ink-900/50")} />
                        <span className="flex-1">{item.label}</span>
                        {item.hint && (
                          <span className="text-xs text-ink-900/40">{item.hint}</span>
                        )}
                        <ArrowRight
                          className={cn(
                            "h-3.5 w-3.5 transition",
                            isActive ? "translate-x-0 text-accent opacity-100" : "-translate-x-1 opacity-0",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-ink-200 bg-ink-50/60 px-4 py-2 text-[11px] text-ink-900/40">
              <span className="flex items-center gap-3">
                <span><kbd>↑↓</kbd> navigate</span>
                <span><kbd>↵</kbd> select</span>
                <span><kbd>esc</kbd> close</span>
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Athena
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
