import Link from "next/link";
import { FollowButton } from "@/components/follow-button";

// A single reader row: identity + stats on the left, follow control on the
// right. Presentational (no hooks) so it renders in both server pages (followers
// / following lists) and client pages (people directory).
export function PersonRow({
  username,
  displayName,
  bio,
  stats,
  isSelf,
}: {
  username: string;
  displayName: string | null;
  bio?: string | null;
  stats?: string;
  isSelf?: boolean;
}) {
  return (
    <li className="flex items-start justify-between gap-4 rounded-lg border border-ink-200 p-4 transition hover:border-accent/40">
      <div className="min-w-0">
        <Link href={`/u/${username}`} className="font-serif text-lg text-ink-900 hover:text-accent">
          {displayName ?? username}
        </Link>
        <p className="text-sm text-accent">@{username}</p>
        {bio && <p className="mt-1 line-clamp-2 text-sm text-ink-900/70">{bio}</p>}
        {stats && <p className="mt-2 text-xs text-ink-900/50">{stats}</p>}
      </div>
      {isSelf ? (
        <span className="shrink-0 rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-900/50">
          You
        </span>
      ) : (
        <FollowButton username={username} className="shrink-0" />
      )}
    </li>
  );
}
