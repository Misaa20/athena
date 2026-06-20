import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Send feedback about Athena during beta testing.",
};

const feedbackEmail = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "feedback@example.com";

export default function FeedbackPage() {
  const subject = encodeURIComponent("Athena beta feedback");
  const body = encodeURIComponent(
    [
      "What happened?",
      "",
      "What did you expect?",
      "",
      "Page or feature:",
      "",
      "Browser/device:",
      "",
    ].join("\n"),
  );

  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Feedback</p>
        <h1 className="mt-2 font-serif text-4xl text-ink-900">Tell us what broke or felt off.</h1>
        <p className="mt-3 text-ink-900/65">
          Use this during tester rollout for bugs, confusing flows, bad recommendations, missing books,
          and anything that made Athena harder to use.
        </p>
      </header>

      <div className="rounded-lg border border-ink-200 bg-ink-100 p-6">
        <h2 className="font-serif text-2xl text-ink-900">Send a report</h2>
        <p className="mt-2 text-ink-900/65">
          Include what you were trying to do, what happened, and the page you were on.
        </p>
        <a
          href={`mailto:${feedbackEmail}?subject=${subject}&body=${body}`}
          className="mt-5 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-ink-50 shadow-glow transition hover:bg-accent-dark"
        >
          Email feedback
        </a>
      </div>

      <p className="text-sm text-ink-900/50">
        Configure the destination with <code>NEXT_PUBLIC_FEEDBACK_EMAIL</code>. The current destination is{" "}
        <span className="text-ink-900/70">{feedbackEmail}</span>.
      </p>

      <Link href="/" className="inline-flex text-sm text-accent hover:underline">
        Back to Athena
      </Link>
    </article>
  );
}
