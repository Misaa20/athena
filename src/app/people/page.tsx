"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/follow-button";
import { authedFetch } from "@/lib/client";

type Person = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  followers: number;
  books: number;
  reviews: number;
  isFollowing: boolean;
  isSelf: boolean;
};

export default function PeoplePage() {
  const { ready } = usePrivy();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await authedFetch<{ users: Person[] }>(
        `/api/people${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`,
      );
      setPeople(data.users ?? []);
    } catch {
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // (Re)load once Privy is ready so results carry the right follow state.
  useEffect(() => {
    if (ready) load("");
  }, [ready, load]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query);
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-4xl text-ink-900">Readers</h1>
        <p className="mt-2 text-ink-900/60">
          Find people to follow and see what they’re reading and reviewing.
        </p>
      </header>

      <form onSubmit={onSearch} className="flex gap-2">
        <Input
          placeholder="Search readers by name or @username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {people === null ? (
        <p className="text-ink-900/50">Loading…</p>
      ) : people.length === 0 ? (
        <p className="text-ink-900/60">No readers found{query ? ` for “${query}”` : ""}.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {people.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-ink-200 p-4"
            >
              <div className="min-w-0">
                <Link href={`/u/${p.username}`} className="font-serif text-lg text-ink-900 hover:underline">
                  {p.displayName ?? p.username}
                </Link>
                <p className="text-sm text-accent">@{p.username}</p>
                {p.bio && <p className="mt-1 line-clamp-2 text-sm text-ink-900/70">{p.bio}</p>}
                <p className="mt-2 text-xs text-ink-900/50">
                  {p.books} book{p.books === 1 ? "" : "s"} · {p.reviews} review
                  {p.reviews === 1 ? "" : "s"} · {p.followers} follower
                  {p.followers === 1 ? "" : "s"}
                </p>
              </div>
              {p.isSelf ? (
                <span className="shrink-0 rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-900/50">
                  You
                </span>
              ) : (
                <FollowButton username={p.username} className="shrink-0" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
