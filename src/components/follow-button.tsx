"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { authedFetch } from "@/lib/client";
import { fetchFollowStatus } from "@/lib/follow-status";
import { cn } from "@/lib/utils";

// Self-contained follow toggle. Resolves its own state on mount (the server can't
// know who's viewing, since auth is token-based), hides itself on your own
// profile, and prompts login when an anonymous visitor clicks.
export function FollowButton({
  username,
  className,
  onChange,
}: {
  username: string;
  className?: string;
  onChange?: (following: boolean) => void;
}) {
  const { ready, authenticated, login } = usePrivy();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [self, setSelf] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    fetchFollowStatus(username)
      .then((d) => {
        if (!active) return;
        setFollowing(d.following);
        setSelf(d.self);
      })
      .catch(() => {
        if (active) setFollowing(false);
      });
    return () => {
      active = false;
    };
  }, [ready, authenticated, username]);

  if (self) return null;

  async function toggle() {
    if (!authenticated) {
      login();
      return;
    }
    setBusy(true);
    const next = !following;
    try {
      if (next) {
        await authedFetch("/api/follow", {
          method: "POST",
          body: JSON.stringify({ username }),
        });
      } else {
        await authedFetch(`/api/follow?username=${encodeURIComponent(username)}`, {
          method: "DELETE",
        });
      }
      setFollowing(next);
      onChange?.(next);
    } catch {
      // leave state unchanged on failure
    } finally {
      setBusy(false);
    }
  }

  const label = following === null ? "…" : following ? "Following" : "Follow";

  return (
    <button
      onClick={toggle}
      disabled={busy || following === null}
      className={cn(
        "rounded-md border px-4 py-1.5 text-sm transition disabled:opacity-50",
        following
          ? "border-ink-200 text-ink-900/70 hover:border-wine hover:text-wine"
          : "border-ink-900 bg-ink-900 text-ink-50 hover:bg-ink-950",
        className,
      )}
    >
      {busy ? "…" : label}
    </button>
  );
}
