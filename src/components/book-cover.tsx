"use client";

import { useState } from "react";
import { BookOpenText } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  title: string;
  authors?: string[];
  className?: string;
  /** Render bigger placeholder text & icon for detail pages. */
  size?: "sm" | "md" | "lg";
};

// Single source of truth for rendering a book cover. Shows the image when
// available, and on either no-URL or load-failure falls back to a styled
// "spine" — gradient surface, embossed title, and a small book icon —
// instead of a broken-image glyph or bare title text.
export function BookCover({ src, title, authors, className, size = "md" }: Props) {
  const [broken, setBroken] = useState(false);
  const showCover = Boolean(src) && !broken;

  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-md bg-ink-100 ring-1 ring-inset ring-ink-200/50",
        className,
      )}
    >
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={title}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Placeholder title={title} authors={authors} size={size} />
      )}
    </div>
  );
}

function Placeholder({
  title,
  authors,
  size,
}: {
  title: string;
  authors?: string[];
  size: "sm" | "md" | "lg";
}) {
  const titleClass =
    size === "lg"
      ? "text-xl leading-tight"
      : size === "md"
      ? "text-sm leading-snug"
      : "text-[11px] leading-tight";
  const iconClass = size === "lg" ? "h-7 w-7" : size === "md" ? "h-4 w-4" : "h-3 w-3";

  return (
    <div className="relative flex h-full w-full flex-col justify-between bg-gradient-to-br from-ink-100 via-ink-200/60 to-ink-50 p-3">
      {/* Decorative spine band on the left edge */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-accent/50 via-accent/20 to-wine/30" />
      {/* Subtle gold corner glow */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-accent/15 blur-2xl" />

      <div className="flex justify-end">
        <BookOpenText className={cn("text-accent/60", iconClass)} />
      </div>

      <div className="space-y-1 pl-2">
        <p className={cn("font-serif text-ink-900 line-clamp-4", titleClass)}>{title}</p>
        {authors && authors.length > 0 && (
          <p className="text-[10px] uppercase tracking-wider text-ink-900/45 line-clamp-1">
            {authors.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
