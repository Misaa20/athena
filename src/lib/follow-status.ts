"use client";

import { authedFetch } from "@/lib/client";

export type FollowStatus = { following: boolean; self: boolean };

// Coalesces concurrent follow-status lookups into a single batched request.
// Every FollowButton on a page calls fetchFollowStatus() on mount; instead of
// each firing its own GET, we collect the usernames requested within a short
// window and send one POST /api/follow/status. This turns the page's N+1 burst
// (which used to overwhelm a cold Neon DB) into a single round trip.

const BATCH_WINDOW_MS = 50;

type Waiter = { resolve: (s: FollowStatus) => void; reject: (e: unknown) => void };

let waiters = new Map<string, Waiter[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  const batch = waiters;
  waiters = new Map();
  timer = null;

  const usernames = [...batch.keys()];
  try {
    const { statuses } = await authedFetch<{ statuses: Record<string, FollowStatus> }>(
      "/api/follow/status",
      { method: "POST", body: JSON.stringify({ usernames }) },
    );
    for (const [username, list] of batch) {
      // A username with no row in the DB simply isn't followed.
      const status = statuses[username] ?? { following: false, self: false };
      for (const w of list) w.resolve(status);
    }
  } catch (err) {
    for (const [, list] of batch) for (const w of list) w.reject(err);
  }
}

export function fetchFollowStatus(username: string): Promise<FollowStatus> {
  return new Promise((resolve, reject) => {
    const list = waiters.get(username);
    if (list) {
      list.push({ resolve, reject });
    } else {
      waiters.set(username, [{ resolve, reject }]);
    }
    if (!timer) timer = setTimeout(flush, BATCH_WINDOW_MS);
  });
}
