import * as React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "glass" | "flat";
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  const base = "group relative rounded-xl p-6 transition duration-300";
  const variants = {
    default:
      "border border-ink-200 bg-ink-100/60 shadow-sm backdrop-blur hover:border-accent/40 hover:shadow-glow hover:-translate-y-0.5",
    glass:
      "glass shadow-sm hover:shadow-glow hover:-translate-y-0.5",
    flat: "border border-ink-200/50 bg-ink-100/30",
  } as const;

  return <div className={cn(base, variants[variant], className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 flex flex-col gap-1", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-serif text-lg text-ink-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-ink-900/60", className)} {...props} />;
}
