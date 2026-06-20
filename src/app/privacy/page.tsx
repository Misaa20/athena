import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Athena handles reading data, quotes, notes, and account information.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Privacy</p>
        <h1 className="mt-2 font-serif text-4xl text-ink-900">Your reading life should stay yours.</h1>
        <p className="mt-3 text-ink-900/65">
          Athena stores the information needed to run your account: identity from your sign-in provider,
          your shelves, reviews, saved quotes, private notes, follows, and reading preferences. We use
          it to provide the product and personalize recommendations.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">What we collect</h2>
        <p className="text-ink-900/65">
          We collect account identity from Privy and linked providers, books you add, reading statuses,
          ratings, reviews, quotes, notes, custom shelves, follows, and basic operational logs needed
          to diagnose errors and keep Athena reliable.
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
        <h2 className="font-serif text-2xl text-ink-900">What is public</h2>
        <p className="text-ink-900/65">
          Public profiles show your display name, bio, follows, public shelves, public reviews, and
          public quotes. Notes are private. Private shelves are hidden from public profiles. Reviews
          and quotes can be stored as private data in the database, and public pages only show records
          marked public.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">Third-party services</h2>
        <p className="text-ink-900/65">
          Athena uses Privy for authentication, PostgreSQL hosting for storage, book catalog APIs such
          as Google Books and OpenLibrary for metadata, and an AI provider when you ask for generated
          recommendations or reading personality summaries.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">Beta logs and feedback</h2>
        <p className="text-ink-900/65">
          During tester rollout, error logs and feedback reports may include page names, browser context,
          and details you choose to send. Do not include sensitive personal information in feedback.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-ink-900">Questions</h2>
        <p className="text-ink-900/65">
          This page is a product-stage summary, not final legal advice. For privacy questions, use the
          feedback page before sharing sensitive information.
        </p>
      </section>

      <Link href="/" className="inline-flex text-sm text-accent hover:underline">
        Back to Athena
      </Link>
    </article>
  );
}
