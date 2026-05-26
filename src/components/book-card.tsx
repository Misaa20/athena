"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BookCover } from "@/components/book-cover";

type Props = {
  id?: string;
  externalId?: string;
  title: string;
  authors: string[];
  coverUrl?: string | null;
  /** Override the link target (defaults to the book's detail page). */
  href?: string;
  className?: string;
};

export function BookCard({ id, externalId, title, authors, coverUrl, href, className }: Props) {
  const linkHref =
    href ?? (id ? `/books/${id}` : externalId ? `/books/external/${externalId}` : "#");

  return (
    <Link href={linkHref} className={cn("group block", className)}>
      <div className="relative transition duration-300 group-hover:-translate-y-1">
        <BookCover
          src={coverUrl}
          title={title}
          authors={authors}
          className="shadow-md transition group-hover:shadow-glow group-hover:ring-accent/50"
        />
        <div className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      <div className="mt-3">
        <p className="line-clamp-2 font-serif text-sm text-ink-900 transition-colors group-hover:text-accent">
          {title}
        </p>
        <p className="line-clamp-1 text-xs text-ink-900/60">{authors.join(", ")}</p>
      </div>
    </Link>
  );
}
