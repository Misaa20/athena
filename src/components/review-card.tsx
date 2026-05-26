import Link from "next/link";
import { StarRating } from "@/components/star-rating";
import { ReviewSocial } from "@/components/review-social";

type Reviewer = { username: string; displayName: string | null };
type ReviewBook = { id: string; title: string; authors: string[]; coverUrl: string | null };

// A single review: book cover + title, the rating, and the body. When a
// `reviewer` is given (feeds, profiles of others) it credits and links them;
// omit it on your own list where the author is implied. Pass `reviewId` to
// enable the like + comment controls.
export function ReviewCard({
  book,
  rating,
  body,
  createdAt,
  reviewer,
  spoiler,
  reviewId,
  likes,
  comments,
}: {
  book: ReviewBook;
  rating: number;
  body: string;
  createdAt: string;
  reviewer?: Reviewer;
  spoiler?: boolean;
  reviewId?: string;
  likes?: number;
  comments?: number;
}) {
  return (
    <article className="flex gap-4 rounded-lg border border-ink-200 p-4">
      <Link href={`/books/${book.id}`} className="shrink-0">
        <div className="aspect-[2/3] w-16 overflow-hidden rounded bg-ink-100">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt={book.title}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-1 text-center font-serif text-[10px] text-ink-900/40">
              {book.title}
            </div>
          )}
        </div>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <Link href={`/books/${book.id}`} className="font-serif text-ink-900 hover:underline">
            {book.title}
          </Link>
          <span className="text-xs text-ink-900/50">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="line-clamp-1 text-xs text-ink-900/60">{book.authors.join(", ")}</p>

        <div className="mt-2 flex items-center gap-3">
          <StarRating value={rating} />
          {reviewer && (
            <Link
              href={`/u/${reviewer.username}`}
              className="text-sm text-accent hover:underline"
            >
              {reviewer.displayName ?? `@${reviewer.username}`}
            </Link>
          )}
        </div>

        {spoiler ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-wine">
              Spoiler — click to reveal
            </summary>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900/80">{body}</p>
          </details>
        ) : (
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-ink-900/80">{body}</p>
        )}

        {reviewId && (
          <ReviewSocial
            reviewId={reviewId}
            initialLikes={likes ?? 0}
            initialComments={comments ?? 0}
          />
        )}
      </div>
    </article>
  );
}
