"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const privyConfigured = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-ink-900">Start your library</h1>
        <p className="text-sm text-ink-900/60">Free, forever. No ads, no tracking.</p>
      </header>

      {privyConfigured ? <PrivySignup /> : <NoAuthNotice />}

      <p className="text-sm text-ink-900/60">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function PrivySignup() {
  const { login, ready, authenticated, user } = usePrivy();
  if (authenticated) {
    return (
      <p className="rounded-md border border-ink-200 bg-ink-100 p-4 text-sm text-ink-900/70">
        You’re already signed in as {user?.email?.address ?? user?.google?.email ?? "your account"}.{" "}
        <Link href="/dashboard" className="text-accent hover:underline">
          Go to dashboard
        </Link>
      </p>
    );
  }
  return (
    <Button className="w-full" disabled={!ready} onClick={() => login()}>
      Create your account
    </Button>
  );
}

function NoAuthNotice() {
  return (
    <p className="rounded-md border border-ink-200 bg-ink-100 p-4 text-sm text-ink-900/70">
      Auth is not configured yet. Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to <code>.env.local</code> and restart the dev server.
    </p>
  );
}
