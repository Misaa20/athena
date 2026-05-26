import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PersonRow } from "@/components/person-row";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await db.user.findUnique({
    where: { username },
    select: {
      username: true,
      displayName: true,
      following: {
        orderBy: { createdAt: "desc" },
        include: { following: { select: { username: true, displayName: true, bio: true } } },
      },
    },
  });
  if (!user) notFound();

  return (
    <div className="space-y-8">
      <header>
        <Link href={`/u/${username}`} className="text-sm text-accent hover:underline">
          ← {user.displayName ?? user.username}
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-ink-900">Following</h1>
        <p className="mt-1 text-ink-900/60">
          {user.displayName ?? `@${user.username}`} follows {user.following.length} reader
          {user.following.length === 1 ? "" : "s"}.
        </p>
      </header>

      {user.following.length === 0 ? (
        <p className="text-ink-900/60">Not following anyone yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {user.following.map((f) => (
            <PersonRow
              key={f.following.username}
              username={f.following.username}
              displayName={f.following.displayName}
              bio={f.following.bio}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
