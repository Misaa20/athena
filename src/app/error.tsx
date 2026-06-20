"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-ink-200 bg-ink-100 p-6">
      <h1 className="font-serif text-3xl text-ink-900">Something went wrong</h1>
      <p className="mt-2 text-ink-900/65">
        The page failed to load. Try again, and if it keeps happening send the issue from the
        feedback link.
      </p>
      <Button className="mt-5" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
