"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Heart, MessageCircle } from "lucide-react";
import { authedFetch } from "@/lib/client";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: { username: string; displayName: string | null };
};

// Like + comment controls for a single review. Self-resolves the viewer's like
// state on first interaction; comments load lazily when the thread is opened.
export function ReviewSocial({
  reviewId,
  initialLikes,
  initialComments,
}: {
  reviewId: string;
  initialLikes: number;
  initialComments: number;
}) {
  const { authenticated, login } = usePrivy();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentCount, setCommentCount] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  async function toggleLike() {
    if (!authenticated) return login();
    setBusy(true);
    // Resolve true state lazily: if we don't know yet, GET first so the toggle
    // is correct even when the server already had this user's like.
    let current = liked;
    if (current === null) {
      try {
        const s = await authedFetch<{ liked: boolean; count: number }>(
          `/api/reviews/${reviewId}/like`,
        );
        current = s.liked;
        setLikes(s.count);
      } catch {
        current = false;
      }
    }
    try {
      const res = await authedFetch<{ count: number; liked: boolean }>(
        `/api/reviews/${reviewId}/like`,
        { method: current ? "DELETE" : "POST" },
      );
      setLikes(res.count);
      setLiked(res.liked);
    } finally {
      setBusy(false);
    }
  }

  async function openThread() {
    setOpen((o) => !o);
    if (comments === null) {
      try {
        const d = await authedFetch<{ comments: Comment[] }>(`/api/reviews/${reviewId}/comments`);
        setComments(d.comments);
        setCommentCount(d.comments.length);
      } catch {
        setComments([]);
      }
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!authenticated) return login();
    if (!draft.trim()) return;
    setPosting(true);
    try {
      const d = await authedFetch<{ comment: Comment }>(`/api/reviews/${reviewId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      setComments((c) => [...(c ?? []), d.comment]);
      setCommentCount((n) => n + 1);
      setDraft("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="mt-3 border-t border-ink-200/60 pt-3">
      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={toggleLike}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-1.5 transition disabled:opacity-50",
            liked ? "text-wine" : "text-ink-900/60 hover:text-wine",
          )}
        >
          <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
          {likes}
        </button>
        <button
          onClick={openThread}
          className="inline-flex items-center gap-1.5 text-ink-900/60 transition hover:text-accent"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {comments === null ? (
            <p className="text-xs text-ink-900/40">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-ink-900/40">No comments yet. Start the conversation.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="text-sm">
                <Link href={`/u/${c.user.username}`} className="text-accent hover:underline">
                  {c.user.displayName ?? `@${c.user.username}`}
                </Link>{" "}
                <span className="text-ink-900/40">· {new Date(c.createdAt).toLocaleDateString()}</span>
                <p className="text-ink-900/80">{c.body}</p>
              </div>
            ))
          )}

          <form onSubmit={postComment} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={authenticated ? "Add a comment…" : "Sign in to comment"}
              className="h-9 flex-1 rounded-md border border-ink-200 bg-ink-100 px-3 text-sm text-ink-900 placeholder:text-ink-900/40 focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={posting || !draft.trim()}
              className="rounded-md bg-ink-900 px-3 text-sm text-ink-50 transition hover:bg-ink-950 disabled:opacity-50"
            >
              {posting ? "…" : "Post"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
