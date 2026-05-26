import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PersonRow } from "@/components/person-row";

export default async function FollowersPage({
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
      followers: {
        orderBy: { createdAt: "desc" },
        include: { follower: { select: { username: true, displayName: true, bio: true } } },
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
        <h1 className="mt-2 font-serif text-3xl text-ink-900">Followers</h1>
        <p className="mt-1 text-ink-900/60">
          {user.followers.length} reader{user.followers.length === 1 ? "" : "s"} follow{" "}
          {user.displayName ?? `@${user.username}`}.
        </p>
      </header>

      {user.followers.length === 0 ? (
        <p className="text-ink-900/60">No followers yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {user.followers.map((f) => (
            <PersonRow
              key={f.follower.username}
              username={f.follower.username}
              displayName={f.follower.displayName}
              bio={f.follower.bio}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
