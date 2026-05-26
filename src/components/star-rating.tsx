import { cn } from "@/lib/utils";

type Props = {
  /** Rating on a 0–5 scale. */
  value: number;
  /** Number of ratings behind the average, shown in parentheses when present. */
  count?: number;
  className?: string;
};

// Read-only star display. Renders five glyphs and fills them proportionally to
// `value` (so 4.3 shows four full stars and a partial fifth) using a clipped
// overlay, which keeps it accurate without half-star assets.
export function StarRating({ value, count, className }: Props) {
  const clamped = Math.max(0, Math.min(5, value));
  const pct = (clamped / 5) * 100;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative inline-block font-sans text-lg leading-none" aria-hidden>
        <span className="text-ink-200">★★★★★</span>
        <span
          className="absolute inset-0 overflow-hidden text-accent"
          style={{ width: `${pct}%` }}
        >
          ★★★★★
        </span>
      </span>
      <span className="text-sm text-ink-900/70">
        {clamped.toFixed(1)}
        {count ? <span className="text-ink-900/50"> ({count.toLocaleString()})</span> : null}
      </span>
    </div>
  );
}
