import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Athena handles reading data, quotes, and account information.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Privacy</p>
        <h1 className="mt-2 font-serif text-4xl text-ink-900">Your reading life should stay yours.</h1>
        <p className="mt-3 text-ink-900/65">
          Athena stores the information needed to run your account: your shelves, reviews, saved quotes,
          follows, and reading preferences. We use it to provide the product and personalize recommendations.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">What we collect</h2>
        <p className="text-ink-900/65">
          Account identity from the sign-in provider, books you add, ratings, reviews, quotes, notes,
          follows, and basic product usage needed to keep Athena reliable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">How we use it</h2>
        <p className="text-ink-900/65">
          We use your data to show your library, power social features, improve search, and make AI
          recommendations more relevant. We do not sell your reading history.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">Questions</h2>
        <p className="text-ink-900/65">
          This page is a product-stage summary, not final legal advice. For privacy questions, contact the
          Athena team before sharing sensitive information.
        </p>
      </section>

      <Link href="/" className="inline-flex text-sm text-accent hover:underline">
        Back to Athena
      </Link>
    </article>
  );
}
