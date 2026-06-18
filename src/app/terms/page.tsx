import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Basic terms for using Athena.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Terms</p>
        <h1 className="mt-2 font-serif text-4xl text-ink-900">Use Athena thoughtfully.</h1>
        <p className="mt-3 text-ink-900/65">
          These basic terms explain the expected use of Athena while the product is in active development.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">Your content</h2>
        <p className="text-ink-900/65">
          You are responsible for the reviews, notes, quotes, profile details, and other content you add.
          Keep public contributions respectful and lawful.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">Recommendations</h2>
        <p className="text-ink-900/65">
          AI recommendations are suggestions, not guarantees. Book metadata may come from third-party
          catalogs and can occasionally be incomplete or incorrect.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">Availability</h2>
        <p className="text-ink-900/65">
          Athena may change while features are being built. We will try to preserve your data, but beta
          features can move, change, or temporarily go offline.
        </p>
      </section>

      <Link href="/" className="inline-flex text-sm text-accent hover:underline">
        Back to Athena
      </Link>
    </article>
  );
}
