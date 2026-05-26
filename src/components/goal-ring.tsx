import { cn } from "@/lib/utils";

// Presentational circular progress ring for the yearly reading goal. Pure SVG,
// no hooks — usable in both server and client trees.
export function GoalRing({
  read,
  target,
  size = 120,
  className,
}: {
  read: number;
  target: number;
  size?: number;
  className?: string;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, read / target) : 0;
  const offset = circumference * (1 - pct);
  const done = target > 0 && read >= target;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3b2e1f" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? "#d9a85c" : "#d9a85c"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-serif text-2xl text-ink-900">{read}</span>
        <span className="text-xs text-ink-900/50">of {target}</span>
      </div>
    </div>
  );
}
